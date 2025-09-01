import { ApiError } from "@/errors/api-error";
import { MaybePromise } from "@peerbench/sdk";
import { NextRequest, NextResponse } from "next/server";

/**
 * Modifies the request handler to handle errors
 */
export function withErrorHandler<T, K>(
  handler: (req: NextRequest, params: K) => MaybePromise<T>
) {
  return async (req: NextRequest, params: K) => {
    try {
      return await handler(req, params);
    } catch (error) {
      console.error(`Error in route handler ${req.url}: ${error}`);

      if (error instanceof ApiError) {
        return NextResponse.json(
          { message: error.message, ...(error.body || {}) },
          { status: error.status }
        );
      }

      return NextResponse.json(
        { message: "Internal server error" },
        { status: 500 }
      );
    }
  };
}
