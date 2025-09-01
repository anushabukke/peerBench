import { z } from "zod";

/**
 * Formats the errors from the given
 * ZodError in a human readable way.
 */
export function zodErrorFormat(error: z.ZodError) {
  return error.errors
    .map((e) => {
      if (e.path.length > 0) {
        return `- ${e.path.join(".")}: ${e.message}`;
      }

      return `- ${e.message}`;
    })
    .join("\n");
}
