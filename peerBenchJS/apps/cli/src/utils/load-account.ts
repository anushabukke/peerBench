import { env } from "@/environment";

/**
 * Checks whether the private key is set and the account
 * object is usable. Throws error if it is not.
 *
 * @param err Error message or a function that returns the Error object that is going to be thrown if the account is not usable
 * @returns Account object created from environment variable PB_PRIVATE_KEY
 */
export function loadAccount(err?: string | (() => Error)) {
  const account = env().account;
  if (account === undefined) {
    if (typeof err === "function") {
      throw err();
    }

    throw new Error(err || "PB_PRIVATE_KEY environment variable must be set");
  }

  return account;
}
