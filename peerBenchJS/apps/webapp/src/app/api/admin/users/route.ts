import { NextResponse } from "next/server";
import { AdminService } from "@/services/admin.service";
import { OrganizationService } from "@/services/organization.service";

/**
 * GET /api/admin/users
 * Get all users with comprehensive activity metrics for admin dashboard
 * Hidden URL - no auth required
 */
export async function GET() {
  try {
    const users = await AdminService.getUserActivityMetrics();

    // Enrich with organization data
    const enrichedUsers = await Promise.all(
      users.map(async (user) => {
        const orgLookup = user.email
          ? await OrganizationService.lookupByEmail(user.email)
          : { found: false };
        return {
          ...user,
          organizationName: orgLookup.found
            ? orgLookup.organization?.name || null
            : null,
        };
      })
    );

    return NextResponse.json({
      users: enrichedUsers,
      total: enrichedUsers.length,
    });
  } catch (error) {
    console.error("Error fetching user activity metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch user activity metrics" },
      { status: 500 }
    );
  }
}
