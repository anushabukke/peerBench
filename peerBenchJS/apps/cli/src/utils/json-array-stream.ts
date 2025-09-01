import { once } from "node:events";
import fs from "node:fs";

/**
 * Creates a stream to the target file for
 * progressively writing JSON objects as a whole array.
 */
export function createJsonArrayStream(filePath: string) {
  const out = fs.createWriteStream(filePath, { encoding: "utf8" });
  let first = true;

  // Queue the beginning of the array
  (async () => {
    await writeChunk(out, "[\n");
  })();

  return {
    async write(obj: unknown | string) {
      const sep = first ? "" : ",";
      first = false;
      await writeChunk(
        out,
        sep + (typeof obj === "string" ? obj : JSON.stringify(obj))
      );
    },
    async end() {
      await writeChunk(out, "]\n");
      out.end();
      await once(out, "finish");
    },
  };
}

/**
 * Writes a chunk to the stream.
 */
async function writeChunk(stream: fs.WriteStream, chunk: string | Buffer) {
  if (!stream.write(chunk)) await once(stream, "drain");
}

export type JsonArrayStream = ReturnType<typeof createJsonArrayStream>;
