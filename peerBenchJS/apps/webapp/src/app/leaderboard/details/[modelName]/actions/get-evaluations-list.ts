"use server";

import { getUser } from "@/lib/actions/auth";
import { NULL_UUID } from "@/lib/constants";
import { EvaluationService } from "@/services/evaluation.service";

export async function getEvaluationsList(options: {
  model: string;
  page?: number;
  pageSize?: number;
  promptSetId?: number;
  protocolAddress?: string;
  provider?: string;
  promptType?: string;
}) {
  try {
    const user = await getUser();
    const evaluations = await EvaluationService.getEvaluationsList({
      requestedByUserId: user?.id ?? NULL_UUID,
      page: options.page || 1,
      pageSize: options.pageSize || 10,
      filters: {
        model: options.model,
        promptSetId: options.promptSetId,
        protocolAddress: options.protocolAddress,
        provider: options.provider,
        promptType: options.promptType,
      },
    });

    return {
      data: evaluations,
    };
  } catch (error) {
    console.error(error);
    return {
      error: "Failed to fetch evaluations list",
    };
  }
}
