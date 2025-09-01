import { ApiError } from "@/errors/api-error";
import { z } from "zod";

/**
 * Checks if the validation is successful. If not, throws an ApiError.
 * Route handler must be wrapped with `withErrorHandler` in order
 * to handle the error.
 */
export function checkValidation<T, K>(
  validation: z.SafeParseReturnType<T, K>
): K {
  if (!validation.success) {
    throw ApiError.validationError(validation.error.issues);
  }

  return validation.data;
}
