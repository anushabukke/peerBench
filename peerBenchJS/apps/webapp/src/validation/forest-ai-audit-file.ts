import { z } from "zod";
import { TestResultSchema } from "./test-result";

export const ForestAIAuditFileSchema = z.object({
  sessionId: z.string(),
  validatorId: z.number().int(),
  startedAt: z
    .union([z.string().datetime(), z.date()])
    .transform((val) => new Date(val)),
  finishedAt: z
    .union([z.string().datetime(), z.date()])
    .transform((val) => new Date(val)),
  score: z.number(),
  agreementId: z.number().int(),
  offerId: z.number().int(),
  providerId: z.number().int(),
  testResults: z.array(TestResultSchema),
  providerName: z.string().optional(),
  protocol: z.object({
    name: z.string(),
    address: z.string(),
  }),

  metadata: z.record(z.string(), z.any()).optional(),
});

export type ForestAIAuditFile = z.infer<typeof ForestAIAuditFileSchema>;
