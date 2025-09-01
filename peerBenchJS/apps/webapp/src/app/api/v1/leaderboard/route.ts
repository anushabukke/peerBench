import { NextResponse } from "next/server";
import { LeaderboardService } from "@/services/leaderboard.service";

export async function GET() {
  const leaderboards = await LeaderboardService.getLeaderboards();
  return NextResponse.json(leaderboards);
}
