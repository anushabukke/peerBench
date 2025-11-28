import "./error-handler";
import { program } from "./core/program";

import "@/commands/prompt";
import "@/commands/init";
import "@/commands/generate";
import "@/commands/collect";
import "@/commands/list";
import "@/commands/list/components";
import "@/commands/score";
import "@/commands/aggregate";

// import "@/commands/upload";
// import "@/commands/rephrase";
// import "@/commands/std";

async function main() {
  // Parse the CLI arguments
  await program.parseAsync();
}

main();
