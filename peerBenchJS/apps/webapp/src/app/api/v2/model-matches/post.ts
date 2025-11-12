import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { parseBody } from "@/lib/route-kit/middlewares/parse-body";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { modelMatchesTable, providerModelsTable } from "@/database/schema";
import { eq } from "drizzle-orm";

const bodySchema = z.object({
  modelAId: z.number().int().positive(),
  modelBId: z.number().int().positive(),
  winnerId: z.number().int().positive().nullable(), // null means draw
  promptId: z.string().uuid(),
  modelAScore: z.number().min(0).max(1), // 0-1 score for ELO calculation
  modelBScore: z.number().min(0).max(1),
  modelAResponseId: z.string().uuid().optional(),
  modelBResponseId: z.string().uuid().optional(),
});

// Standard ELO calculation with K=32
function calculateElo(
  ratingA: number,
  ratingB: number,
  scoreA: number,
  scoreB: number
): { newRatingA: number; newRatingB: number } {
  const K = 32;

  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedB = 1 / (1 + Math.pow(10, (ratingA - ratingB) / 400));

  const newRatingA = ratingA + K * (scoreA - expectedA);
  const newRatingB = ratingB + K * (scoreB - expectedB);

  return {
    newRatingA: Math.round(newRatingA),
    newRatingB: Math.round(newRatingB),
  };
}

export const POST = createHandler()
  .use(auth)
  .use(parseBody(bodySchema))
  .handle(async (req, ctx) => {
    const matchId = await db.transaction(async (tx) => {
      // Get current ELO ratings with row-level locks to prevent concurrent updates
      // The FOR UPDATE lock ensures only one transaction can update these models at a time
      const [modelA, modelB] = await Promise.all([
        tx
          .select({ id: providerModelsTable.id, elo: providerModelsTable.elo })
          .from(providerModelsTable)
          .where(eq(providerModelsTable.id, ctx.body.modelAId))
          .for("update") // Lock this row
          .limit(1),
        tx
          .select({ id: providerModelsTable.id, elo: providerModelsTable.elo })
          .from(providerModelsTable)
          .where(eq(providerModelsTable.id, ctx.body.modelBId))
          .for("update") // Lock this row
          .limit(1),
      ]);

      if (!modelA[0] || !modelB[0]) {
        throw new Error("One or both models not found");
      }

      const currentEloA = modelA[0].elo ?? 1000;
      const currentEloB = modelB[0].elo ?? 1000;

      // Calculate new ELO ratings based on scores
      const { newRatingA, newRatingB } = calculateElo(
        currentEloA,
        currentEloB,
        ctx.body.modelAScore,
        ctx.body.modelBScore
      );

      // Save the match
      const [insertedMatch] = await tx.insert(modelMatchesTable).values({
        modelAId: ctx.body.modelAId,
        modelBId: ctx.body.modelBId,
        winnerId: ctx.body.winnerId,
        promptId: ctx.body.promptId,
        modelAResponseId: ctx.body.modelAResponseId,
        modelBResponseId: ctx.body.modelBResponseId,
      }).returning({ id: modelMatchesTable.id });

      if (!insertedMatch) {
        throw new Error("Failed to insert model match");
      }

      // Update ELO ratings
      await Promise.all([
        tx
          .update(providerModelsTable)
          .set({ elo: newRatingA })
          .where(eq(providerModelsTable.id, ctx.body.modelAId)),
        tx
          .update(providerModelsTable)
          .set({ elo: newRatingB })
          .where(eq(providerModelsTable.id, ctx.body.modelBId)),
      ]);

      return insertedMatch.id;
    });

    return NextResponse.json({
      success: true,
      message: "Model match saved and ELO ratings updated successfully",
      data: {
        matchId,
      },
    });
  });

export type RequestBodyType = z.infer<typeof bodySchema>;
export type ResponseType = {
  success: boolean;
  message: string;
  data: {
    matchId: string;
  };
};
