import { NextResponse } from "next/server";
import { StatsService } from "@/services/stats.service";

export async function GET() {
  try {
    const orgStats = await StatsService.getOrganizationStats();
    return NextResponse.json(orgStats);
  } catch (error) {
    console.error("Error getting organization stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
