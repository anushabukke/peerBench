import { mkdirSync, statSync } from "fs";
import { z } from "zod";

/**
 * Validates that the given value is a valid and existing directory path
 * @param mkdir If `true`, makes the directory recursively if it doesn't exist
 */
export const DirSchema = (mkdir = false) =>
  z.string().transform((value, ctx) => {
    if (statSync(value, { throwIfNoEntry: false })?.isDirectory()) {
      return value;
    }

    if (mkdir) {
      mkdirSync(value, { recursive: true });
      return value;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Directory does not exist`,
    });

    return z.NEVER;
  });
