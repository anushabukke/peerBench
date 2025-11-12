import { z } from "zod";
import Filters from "./components/filters";
import Stats from "./components/stats";
import { checkValidation } from "@/lib/route-helpers/check-validation";
import EvaluationsTable from "./components/evaluations-table";
import EvaluationsTableSkeleton from "./components/evaluations-table/skeleton";
import { Suspense } from "react";
import StatsSkeleton from "./components/stats/skeleton";

export default async function Page(props: {
  params: Promise<{ modelName: string }>;
  searchParams: Promise<{
    contextType?: string;
    context?: string;
    promptType?: string;
    provider?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const model = decodeURIComponent(await props.params.then((p) => p.modelName));
  const searchParams = checkValidation(
    z
      .object({
        contextType: z.string().optional(),
        context: z.string().optional(),
        page: z.coerce.number().optional().default(1),
        pageSize: z.coerce
          .number()
          .optional()
          .default(10)
          .transform((val) => (val > 500 ? 500 : val)), // Limit to 500
        promptType: z.string().optional(),
        provider: z.string().optional(),
      })
      .transform((data) => {
        if (data.contextType === "prompt-set") {
          const promptSetId = parseInt(data.context || "");
          if (!isNaN(promptSetId)) {
            return {
              ...data,
              contextType: "prompt-set",
              promptSetId,
              protocolAddress: undefined,
            };
          }
        }

        if (data.contextType === "protocol") {
          return {
            ...data,
            contextType: "protocol",
            protocolAddress: data.context,
            promptSetId: undefined,
          };
        }

        return {
          ...data,
          protocolAddress: undefined,
          promptSetId: undefined,
        };
      })
      .safeParse(await props.searchParams)
  );

  return (
    <div className="container mx-auto py-8 space-y-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">
        {model}
      </h1>
      <div className="mb-8">
        <Suspense
          key={`${searchParams?.promptSetId}-${searchParams?.protocolAddress}`}
          fallback={<StatsSkeleton />}
        >
          <Stats
            modelName={model}
            promptSetId={searchParams?.promptSetId}
            protocolAddress={searchParams?.protocolAddress}
          />
        </Suspense>
      </div>
      <Filters modelName={model} />
      <Suspense
        key={`${searchParams?.page}-${searchParams?.pageSize}-${searchParams?.promptSetId}-${searchParams?.protocolAddress}-${searchParams?.promptType}-${searchParams?.provider}`}
        fallback={
          <EvaluationsTableSkeleton pageSize={searchParams?.pageSize} />
        }
      >
        <EvaluationsTable
          modelName={model}
          promptSetId={searchParams?.promptSetId}
          protocolAddress={searchParams?.protocolAddress}
          page={searchParams?.page}
          pageSize={searchParams?.pageSize}
          promptType={searchParams?.promptType}
          provider={searchParams?.provider}
        />
      </Suspense>
    </div>
  );
}
