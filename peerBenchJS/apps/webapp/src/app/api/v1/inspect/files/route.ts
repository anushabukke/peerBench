import { NextRequest, NextResponse } from "next/server";
import { getFiles } from "@/app/inspect/actions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

    const data = await getFiles({ page, pageSize });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error getting inspect files:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
