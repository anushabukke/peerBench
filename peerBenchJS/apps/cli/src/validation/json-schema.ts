import { z } from "zod";

/*
 * Validates that the given string is a valid JSON value and
 * transforms it into the given type.
 */
export const JSONSchema = <T>(params?: {
  message?: string;
  schema?: z.ZodSchema<T>;
}) =>
  z.string().transform((value, ctx) => {
    const message = params?.message ?? "Invalid JSON";

    try {
      const parsed = JSON.parse(value) as T;

      if (params?.schema) {
        const result = params.schema.safeParse(parsed);
        if (!result.success) {
          result.error.issues.forEach((issue) => {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: issue.message,
            });
          });

          return z.NEVER;
        }
      }
      return parsed;
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message,
      });

      return z.NEVER;
    }
  });
