import { NextResponse } from "next/server";
import { StatsService } from "@/services/stats.service";

export async function GET() {
  try {
    const leaderboard = await StatsService.getPeerLeaderboard();
    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error("Error getting peer leaderboard:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
