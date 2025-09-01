import { NextResponse } from "next/server";
import { PromptSetService } from "@/services/prompt.service";

export async function GET() {
  try {
    const promptSets = await PromptSetService.getPromptSets();

    // Filter out PubMed temporarily (matching the existing logic)
    const filteredPromptSets = promptSets.filter(
      (ps) => ps.title.toLowerCase() !== "pubmed"
    );

    return NextResponse.json(filteredPromptSets);
  } catch (error) {
    console.error("Error fetching prompt sets:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
