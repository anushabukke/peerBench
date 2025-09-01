import { db } from "@/database/client";
import { eq } from "drizzle-orm";
import { userProfileTable } from "@/database/schema";

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

export interface UserProfileUpdate {
  displayName?: string | null;
  github?: string | null;
  website?: string | null;
  bluesky?: string | null;
  mastodon?: string | null;
  twitter?: string | null;
}

export class UserProfileService {
  static async getProfileByUserId(userId: string): Promise<UserProfile | null> {
    try {
      const result = await db
        .select()
        .from(userProfileTable)
        .where(eq(userProfileTable.userId, userId))
        .limit(1);

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error("Error getting user profile:", error);
      return null;
    }
  }

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

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error("Error creating user profile:", error);
      return null;
    }
  }

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

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error("Error updating user profile:", error);
      return null;
    }
  }

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
