import { NextResponse } from "next/server";
import { StatsService } from "@/services/stats.service";

export async function GET() {
  try {
    const validatorStats = await StatsService.getValidatorLeaderboard();
    return NextResponse.json(validatorStats);
  } catch (error) {
    console.error("Error getting validator leaderboard:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
