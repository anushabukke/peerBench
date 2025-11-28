import { NextRequest, NextResponse } from "next/server";
import { runSimulation } from "@/sim/server";
import type { SimulationConfig } from "@/sim/types";
import { createHandler } from "@/lib/route-kit";
import { ApiError } from "@/errors/api-error";
import { authAdmin } from "@/lib/route-kit/middlewares/auth-admin";

export const POST = createHandler()
  .use(authAdmin)
  .handle(async (req: NextRequest) => {
    const body = await req.json();
    const config = body.config as SimulationConfig;

    if (!config) {
      throw ApiError.badRequest("Missing simulation configuration");
    }

    try {
      const result = await runSimulation(config);

      return NextResponse.json(result);
    } catch (error) {
      console.error("Simulation error:", error);
      throw ApiError.server(
        `Simulation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  });
