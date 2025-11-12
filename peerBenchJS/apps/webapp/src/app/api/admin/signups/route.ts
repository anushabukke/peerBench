import { NextResponse } from "next/server";
import { AdminService } from "@/services/admin.service";

/**
 * GET /api/admin/signups
 * Get signup trends over time (daily or weekly)
 * Hidden URL - no auth required
 * Query params:
 *  - period: "daily" | "weekly" (default: "daily")
 *  - days: number of days to look back (default: 90)
 *  - weeks: number of weeks to look back (default: 12)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "daily";
    const days = parseInt(searchParams.get("days") || "90");
    const weeks = parseInt(searchParams.get("weeks") || "12");

    let trends;
    if (period === "weekly") {
      trends = await AdminService.getWeeklySignupTrends(weeks);
    } else {
      trends = await AdminService.getSignupTrends(days);
    }

    return NextResponse.json({
      period,
      trends,
      total: trends.length,
    });
  } catch (error) {
    console.error("Error fetching signup trends:", error);
    return NextResponse.json(
      { error: "Failed to fetch signup trends" },
      { status: 500 }
    );
  }
}
