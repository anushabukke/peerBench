import { DirSchema } from "@/validation/dir-schema";
import { Option } from "commander";
import { join } from "path";

export const OptionOutputDir = (folder?: string, mkdir = true) =>
  new Option("-o, --output <output>", "Output directory")
    .default(
      DirSchema(mkdir).parse(
        folder ? join(`peerbench-data`, folder) : "peerbench-data"
      )
    )
    .argParser((value) => DirSchema(mkdir).parse(value));
