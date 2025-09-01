import { logger } from "@/core/logger";
import { program } from "@/core/program";
import { confirm } from "@inquirer/prompts";
import { statSync, writeFileSync } from "fs";
import { generatePrivateKey } from "viem/accounts";

program
  .command("init")
  .description(
    `Creates a .env file in the current directory and places necessary\nenvironment variables in it. E.g PB_PRIVATE_KEY for signing the files`
  )
  .action(async () => {
    if (statSync(".env", { throwIfNoEntry: false })?.isFile()) {
      const approved = await confirm({
        message: "A .env file is already exists. Do you want to overwrite it?",
        default: false,
      }).catch(() => false);

      if (!approved) {
        return;
      }
    }

    // TODO: Add more variables and options if needed
    writeFileSync(".env", `PB_PRIVATE_KEY=${generatePrivateKey()}`, {
      encoding: "utf-8",
    });

    logger.info("Done");
  });
