import { z } from "zod";
import { zodErrorFormat } from "@/utils/zod-error-format";
import { red } from "ansis";
import { ensureError } from "@/utils/ensure-error";

/**
 * Set global error handlers so we can nicely show
 * error messages and exit from the process.
 */
["uncaughtException", "unhandledRejection"].map((e) =>
  process.on(e, (err) => {
    const error = ensureError(err);
    if (error instanceof z.ZodError) {
      console.error(red(zodErrorFormat(error)));
      return;
    }

    // Manually check the env variable and decide whether to log
    // error stack or just its message.
    const isDev = ["dev", "development", "devel"].includes(
      process.env.NODE_ENV || process.env.PB_NODE_ENV || ""
    );

    console.error(
      red(`Something went wrong: ${isDev ? error.stack : error.message}`)
    );
  })
);
