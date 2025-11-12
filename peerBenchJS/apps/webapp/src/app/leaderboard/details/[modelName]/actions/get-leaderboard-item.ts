"use server";

import { LeaderboardService } from "@/services/leaderboard.service";
import { getUser } from "@/lib/actions/auth";
import { NULL_UUID } from "@/lib/constants";

export async function getLeaderboardItem(options: {
  model: string;
  promptSetId?: number;
  protocolAddress?: string;
}) {
  try {
    const user = await getUser();
    const leaderboardItem = await LeaderboardService.getLeaderboardItem({
      filters: {
        model: options.model,
        promptSetId: options.promptSetId,
        protocolAddress: options.protocolAddress,
      },
      requestedByUserId: user?.id ?? NULL_UUID,
    });

    return {
      data: leaderboardItem,
    };
  } catch (error) {
    console.error(error);
    return {
      error: "Failed to fetch leaderboard item",
    };
  }
}
