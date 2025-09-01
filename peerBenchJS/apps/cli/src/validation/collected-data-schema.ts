import { z } from "zod";

export const CollectedDataSchema = z.object({
  collectorIdentifier: z.string(),
  source: z.unknown(),
  data: z.any(),
});

export type CollectedDataSave = z.infer<typeof CollectedDataSchema>;
