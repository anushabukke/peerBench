import { collectors } from "@/collectors";
import { generators } from "@/generators";
import { listCommand } from "..";
import { providers } from "@/providers";
import { scorers } from "@/scorers";

listCommand
  .command("components")
  .description(
    "Lists all the available Components such as Collectors, Generators, Providers"
  )
  .action(async () => {
    console.log("Available Collectors:");
    console.log(collectors.map((c) => c.identifier).join(", "));

    console.log();

    console.log("Available Generators:");
    console.log(generators.map((g) => g.identifier).join(", "));

    console.log();

    console.log("Available Providers:");
    console.log(providers.map((p) => p.identifier).join(", "));

    console.log();

    console.log("Available Scorers:");
    console.log(scorers.map((s) => s.identifier).join(", "));
  });
