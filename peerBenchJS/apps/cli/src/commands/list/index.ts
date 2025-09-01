import { program } from "@/core/program";

export const listCommand = program
  .command("list")
  .description("Lists the given entities");
