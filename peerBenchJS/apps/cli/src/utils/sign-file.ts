import { loadAccount } from "@/utils/load-account";
import { EnvVariableNeededError } from "@/errors/env";
import fs from "fs/promises";

/**
 * Signs a file with the global configured Validator account.
 * The signature is saved as a `.signature` file next to the original file.
 *
 * @returns The signature as a hex string
 */
export async function signFile(path: string, suffix = ".signature") {
  const account = loadAccount(
    () =>
      new EnvVariableNeededError(
        "PB_PRIVATE_KEY must be set for signing the files"
      )
  );

  const signature = await account.signMessage({
    message: await fs.readFile(path, { encoding: "utf-8" }),
  });

  await fs.writeFile(`${path}${suffix}`, signature, {
    encoding: "utf-8",
  });

  return signature;
}
