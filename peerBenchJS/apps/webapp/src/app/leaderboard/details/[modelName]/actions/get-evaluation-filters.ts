"use server";

import { getUser } from "@/lib/actions/auth";
import { NULL_UUID } from "@/lib/constants";
import { EvaluationService } from "@/services/evaluation.service";

export async function getEvaluationFilters(model?: string) {
  try {
    const user = await getUser();
    const filters = await EvaluationService.getEvaluationsListFilterValues({
      requestedByUserId: user?.id ?? NULL_UUID,
      filters: {
        model,
      },
    });

    return {
      data: filters,
    };
  } catch (error) {
    console.error(error);
    return {
      error: "Failed to fetch evaluation filters",
    };
  }
}
