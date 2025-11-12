/**
 * Database Operations for Simulated User Creation
 *
 * Handles creation of realistic simulated users in the database:
 * - Creates auth user with simulated email (using Supabase Auth Admin API)
 * - Creates user profile with metadata marking it as simulated (using Drizzle)
 * - Links user to organization via org_to_people (using Drizzle)
 *
 * @module server-only
 */

import "server-only";
import { db } from "@/database/client";
import {
  userProfileTable,
  orgToPeopleTable,
  orgsTable,
  orgDomainsTable,
} from "@/database/schema";
import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";

interface CreateSimulatedUserParams {
  displayName: string;
  email: string;
  orgId: number;
  metadata: {
    isSimulated: true;
    simulationType: "realistic";
    personality: any;
    benchmarkIdea: any;
  };
}

interface CreateSimulatedUserResult {
  userId: string;
  email: string;
  displayName: string;
  orgId: number;
}

/**
 * Get Supabase admin client for auth operations
 */
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Check both possible environment variable names
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Missing Supabase configuration for simulated user creation"
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create a simulated user in the database
 */
export async function createSimulatedUser(
  params: CreateSimulatedUserParams
): Promise<CreateSimulatedUserResult> {
  const supabase = getSupabaseAdmin();

  console.log(
    `Creating simulated user: ${params.displayName} with email: ${params.email}`
  );

  // STEP 1: Check for any orphaned profiles with this email in metadata
  // This handles cases where auth user was deleted but profile remains
  const orphanedProfiles = await db
    .select()
    .from(userProfileTable)
    .where(eq(userProfileTable.displayName, params.displayName))
    .limit(5);

  for (const orphan of orphanedProfiles) {
    console.log(
      `⚠️  Found orphaned profile for ${params.displayName} with userId ${orphan.userId}, cleaning up...`
    );
    try {
      // Delete org links first (foreign key)
      await db
        .delete(orgToPeopleTable)
        .where(eq(orgToPeopleTable.userId, orphan.userId));
      // Then delete profile
      await db
        .delete(userProfileTable)
        .where(eq(userProfileTable.userId, orphan.userId));
      console.log(`   Cleaned up orphaned profile ${orphan.userId}`);
    } catch (cleanupErr) {
      console.error(`   Failed to cleanup orphaned profile:`, cleanupErr);
    }
  }

  // STEP 2: Check if user already exists by email in auth
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users.find(
    (u) => u.email === params.email
  );

  let userId: string;
  let wasExisting = false;

  if (existingUser) {
    console.log(
      `User with email ${params.email} already exists in auth, using existing ID: ${existingUser.id}`
    );
    userId = existingUser.id;
    wasExisting = true;

    // Check if profile exists
    const existingProfile = await db
      .select()
      .from(userProfileTable)
      .where(eq(userProfileTable.userId, userId))
      .limit(1);

    if (existingProfile.length > 0) {
      console.log(
        `User profile already exists for ${params.displayName}, returning existing user`
      );
      return {
        userId,
        email: params.email,
        displayName: params.displayName,
        orgId: params.orgId,
      };
    }
  } else {
    // STEP 3: Create new auth user
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: params.email,
        email_confirm: true, // Auto-confirm simulated users
        user_metadata: {
          ...params.metadata,
          display_name: params.displayName,
        },
      });

    if (authError || !authData.user) {
      throw new Error(
        `Failed to create auth user: ${authError?.message || "Unknown error"}`
      );
    }

    userId = authData.user.id;
    console.log(`Created auth user: ${params.email} with ID: ${userId}`);
  }

  try {
    // STEP 4: Create user profile using Drizzle
    // CRITICAL: Check one more time if this exact userId already has a profile
    // This handles Supabase UUID reuse when users are deleted/recreated quickly
    const profileCheck = await db
      .select()
      .from(userProfileTable)
      .where(eq(userProfileTable.userId, userId))
      .limit(1);

    if (profileCheck.length > 0) {
      console.log(
        `⚠️  Profile with userId ${userId} already exists (UUID reuse), deleting...`
      );
      // Delete org links first (foreign key)
      await db
        .delete(orgToPeopleTable)
        .where(eq(orgToPeopleTable.userId, userId));
      // Then delete profile
      await db
        .delete(userProfileTable)
        .where(eq(userProfileTable.userId, userId));
      console.log(`   Deleted orphaned profile with reused UUID`);
    }

    await db.insert(userProfileTable).values({
      userId,
      displayName: params.displayName,
      metadata: params.metadata,
    });
    console.log(`Created user profile for ${params.displayName}`);

    // STEP 5: Link user to organization using Drizzle
    await db.insert(orgToPeopleTable).values({
      orgId: params.orgId,
      userId,
    });
    console.log(`Linked ${params.displayName} to org ${params.orgId}`);

    console.log(
      `✅ Successfully created simulated user: ${params.displayName} (${params.email})`
    );

    return {
      userId,
      email: params.email,
      displayName: params.displayName,
      orgId: params.orgId,
    };
  } catch (error) {
    console.error(
      `Failed to create profile/org link for ${params.displayName}:`,
      error
    );

    // If profile or org linking fails and we just created the auth user, try to clean up
    if (!wasExisting) {
      try {
        await supabase.auth.admin.deleteUser(userId);
        console.log(
          `Cleaned up auth user ${userId} after profile creation failure`
        );
      } catch (cleanupError) {
        console.error(`Failed to cleanup auth user:`, cleanupError);
      }
    }
    throw error;
  }
}

/**
 * Get all organizations with their domains using Drizzle
 */
export async function getOrganizationsWithDomains(): Promise<
  Array<{
    id: number;
    name: string;
    country: string | null;
    alphaTwoCode: string | null;
    domains: string[];
  }>
> {
  // Get all orgs
  const orgs = await db
    .select({
      id: orgsTable.id,
      name: orgsTable.name,
      country: orgsTable.country,
      alphaTwoCode: orgsTable.alphaTwoCode,
    })
    .from(orgsTable);

  // Get all org domains
  const domains = await db
    .select({
      orgId: orgDomainsTable.orgId,
      domain: orgDomainsTable.domain,
    })
    .from(orgDomainsTable);

  // Combine orgs with their domains
  return orgs.map((org) => ({
    id: org.id,
    name: org.name,
    country: org.country,
    alphaTwoCode: org.alphaTwoCode,
    domains: domains.filter((d) => d.orgId === org.id).map((d) => d.domain),
  }));
}

/**
 * Get a random organization that has domains
 */
export async function getRandomOrgWithDomain(countries?: string[]): Promise<{
  id: number;
  name: string;
  domain: string;
  country: string | null;
  alphaTwoCode: string | null;
}> {
  const orgs = await getOrganizationsWithDomains();
  let orgsWithDomains = orgs.filter((org) => org.domains.length > 0);

  // Filter by countries if specified
  if (countries && countries.length > 0) {
    orgsWithDomains = orgsWithDomains.filter(
      (org) => org.country && countries.includes(org.country)
    );
  }

  if (orgsWithDomains.length === 0) {
    throw new Error(
      countries && countries.length > 0
        ? `No organizations with domains found for countries: ${countries.join(", ")}`
        : "No organizations with domains found"
    );
  }

  const randomOrg =
    orgsWithDomains[Math.floor(Math.random() * orgsWithDomains.length)]!;
  const randomDomain =
    randomOrg.domains[Math.floor(Math.random() * randomOrg.domains.length)]!;

  return {
    id: randomOrg.id,
    name: randomOrg.name,
    domain: randomDomain,
    country: randomOrg.country,
    alphaTwoCode: randomOrg.alphaTwoCode,
  };
}

/**
 * Generate a unique email for a simulated user
 */
export function generateSimulatedEmail(
  displayName: string,
  domain: string
): string {
  // Create a slug from display name
  const slug = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");

  // Add random suffix to ensure uniqueness
  const randomSuffix = Math.random().toString(36).substring(2, 8);

  const email = `${slug}.sim.${randomSuffix}@${domain}`;

  // Validate email format
  if (!email.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
    console.warn(`Generated invalid email: ${email} for name: ${displayName}`);
    // Fallback to a simple format
    return `sim.${randomSuffix}@${domain}`;
  }

  return email;
}

/**
 * Batch create simulated users
 */
export async function batchCreateSimulatedUsers(
  users: Array<Omit<CreateSimulatedUserParams, "email"> & { orgDomain: string }>
): Promise<CreateSimulatedUserResult[]> {
  const results: CreateSimulatedUserResult[] = [];
  const errors: Array<{ user: string; error: string }> = [];

  for (const user of users) {
    try {
      const email = generateSimulatedEmail(user.displayName, user.orgDomain);
      const result = await createSimulatedUser({
        ...user,
        email,
      });
      results.push(result);
    } catch (error) {
      errors.push({
        user: user.displayName,
        error: error instanceof Error ? error.message : String(error),
      });
      console.error(`Failed to create user ${user.displayName}:`, error);
    }
  }

  if (errors.length > 0) {
    console.warn(`${errors.length} users failed to create:`, errors);
  }

  return results;
}
