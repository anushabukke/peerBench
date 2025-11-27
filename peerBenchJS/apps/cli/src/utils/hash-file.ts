import { calculateCID } from "peerbench";

import fs from "fs/promises";

/**
 * Calculates the CID of the given file and saves the result
 * as a `.cid` file next to the original file.
 *
 * @returns The CID
 */
export async function hashFile(path: string, suffix = ".cid") {
  const content = await fs.readFile(path, { encoding: "utf-8" });
  const cid = await calculateCID(content).then((cid) => cid.toString());

  await fs.writeFile(`${path}${suffix}`, cid, {
    encoding: "utf-8",
  });

  return cid;
}
