import { readFileSync, statSync } from "fs";
import { z } from "zod";

/**
 * Validates that the given value is a valid and existing file path
 * and returns its contents as a string
 */
export const FileSchema = (params?: {
  message?: string | ((value?: string) => string);
  returnType?: "content" | "path";
}) =>
  z.string().transform((value, ctx) => {
    const returnType = params?.returnType ?? "content";

    if (statSync(value, { throwIfNoEntry: false })?.isFile()) {
      if (returnType === "content") {
        return readFileSync(value, "utf-8");
      }

      return value;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        typeof params?.message === "function"
          ? params.message(value)
          : params?.message || `File "${value}" does not exist`,
    });

    return z.NEVER;
  });
