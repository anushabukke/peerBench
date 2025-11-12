import { db } from "@/database/client";
import { eq, getViewSelectedFields, sql } from "drizzle-orm";
import { userProfileTable, userStatsView, usersView } from "@/database/schema";
import { DbOptions } from "@/types/db";
import { withTxOrDb } from "@/database/helpers";

export class ProfileService {
  static async getUserStats(
    options: DbOptions & {
      userId: string;
    }
  ) {
    return withTxOrDb(async (tx) => {
      const [result] = await tx
        .select()
        .from(userStatsView)
        .where(eq(userStatsView.id, options.userId));

      return result;
    }, options.tx);
  }

  static async getUserProfile(
    options: DbOptions & {
      userId: string;
      stats?: boolean;
    }
  ) {
    return withTxOrDb(async (tx) => {
      let query = tx
        .select({
          ...getViewSelectedFields(usersView),
          stats: options.stats
            ? getViewSelectedFields(userStatsView)
            : sql<null>`NULL`,
        })
        .from(usersView)
        .where(eq(usersView.id, options.userId));

      if (options.stats) {
        query = query.innerJoin(
          userStatsView,
          eq(userStatsView.id, usersView.id)
        );
      }

      const [profile] = await query;

      return profile;
    }, options.tx);
  }

  /**
   * @deprecated AI Generated code, don't use if you don't know what you are doing
   */
  static async getProfileByUserId(userId: string): Promise<UserProfile | null> {
    try {
      const result = await db
        .select()
        .from(userProfileTable)
        .where(eq(userProfileTable.userId, userId))
        .limit(1);

      return result.length > 0 ? result[0]! : null;
    } catch (error) {
      console.error("Error getting user profile:", error);
      return null;
    }
  }

  /**
   * @deprecated AI Generated code, don't use if you don't know what you are doing
   */
  static async createProfile(
    userId: string,
    profile: UserProfileUpdate
  ): Promise<UserProfile | null> {
    try {
      const result = await db
        .insert(userProfileTable)
        .values({
          userId,
          ...profile,
        })
        .returning();

      return result.length > 0 ? result[0]! : null;
    } catch (error) {
      console.error("Error creating user profile:", error);
      return null;
    }
  }

  /**
   * @deprecated AI Generated code, don't use if you don't know what you are doing
   */
  static async updateProfile(
    userId: string,
    profile: UserProfileUpdate
  ): Promise<UserProfile | null> {
    try {
      const result = await db
        .update(userProfileTable)
        .set({
          ...profile,
          updatedAt: new Date(),
        })
        .where(eq(userProfileTable.userId, userId))
        .returning();

      return result.length > 0 ? result[0]! : null;
    } catch (error) {
      console.error("Error updating user profile:", error);
      return null;
    }
  }

  /**
   * @deprecated AI Generated code, don't use if you don't know what you are doing
   */
  static async upsertProfile(
    userId: string,
    profile: UserProfileUpdate
  ): Promise<UserProfile | null> {
    try {
      const existingProfile = await this.getProfileByUserId(userId);

      if (existingProfile) {
        return await this.updateProfile(userId, profile);
      } else {
        return await this.createProfile(userId, profile);
      }
    } catch (error) {
      console.error("Error upserting user profile:", error);
      return null;
    }
  }

  /**
   * @deprecated AI Generated code, don't use if you don't know what you are doing
   */
  static async setInvitedBy(
    userId: string,
    invitedByUserId: string
  ): Promise<boolean> {
    try {
      await db
        .update(userProfileTable)
        .set({
          invitedBy: invitedByUserId,
          updatedAt: new Date(),
        })
        .where(eq(userProfileTable.userId, userId));

      return true;
    } catch (error) {
      console.error("Error setting invited by:", error);
      return false;
    }
  }
}

export type UserProfileFuture = Awaited<
  ReturnType<typeof ProfileService.getUserProfile>
>;

/**
 * @deprecated AI Generated code, don't use if you don't know what you are doing
 */
export interface UserProfile {
  id: number;
  userId: string;
  displayName: string | null;
  github: string | null;
  website: string | null;
  bluesky: string | null;
  mastodon: string | null;
  twitter: string | null;
  invitedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * @deprecated AI Generated code, don't use if you don't know what you are doing
 */
export interface UserProfileUpdate {
  displayName?: string | null;
  github?: string | null;
  website?: string | null;
  bluesky?: string | null;
  mastodon?: string | null;
  twitter?: string | null;
}
