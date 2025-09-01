import { dateString } from "@/utils/date-string";
import { normalizePath } from "@/utils/normalize-path";
import { CollectedDataSave } from "@/validation/collected-data-schema";
import fs from "fs/promises";
import path from "path";

/**
 * Saves the data that was collected by a Collector to a file in JSON format
 *
 * @returns The path to the saved file
 */
export async function saveCollectedData(params: {
  source: unknown;
  outputDirectory: string;
  collectorIdentifier: string;
  collectedData: any;
  tags?: string[];
}) {
  const tags =
    params.tags && params.tags.length > 0 ? `.${params.tags.join("-")}` : "";
  const timestamp = dateString();
  const fileName = normalizePath(
    `${params.collectorIdentifier}.${timestamp}.collected${tags}.json`
  );
  const filePath = path.join(params.outputDirectory, fileName);
  const fileContent: CollectedDataSave = {
    collectorIdentifier: params.collectorIdentifier,
    source: params.source,
    data: params.collectedData,
  };

  await fs.writeFile(filePath, JSON.stringify(fileContent, null, 2), "utf-8");

  return filePath;
}
