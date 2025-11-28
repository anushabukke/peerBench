import { Prompt } from "peerbench";
import path from "path";
import fs from "fs/promises";
import { dateString } from "@/utils/date-string";
import { normalizePath } from "@/utils/normalize-path";

/**
 * Saves the Prompts to a file in peerBench Task format
 *
 * @returns The path to the saved file
 */
export async function savePrompts(params: {
  generatorIdentifier: string;
  outputDirectory: string;
  prompts: Prompt[];
  tags?: string[];
}) {
  const tags =
    params.tags && params.tags.length > 0 ? `.${params.tags.join("-")}` : "";
  const timestamp = dateString();
  const fileName = normalizePath(
    `${params.generatorIdentifier}.${timestamp}.generated${tags}.json`
  );
  const filePath = path.join(params.outputDirectory, fileName);

  await fs.writeFile(filePath, JSON.stringify(params.prompts));

  return filePath;
}
