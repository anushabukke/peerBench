"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/pagination";
import { DateTime } from "luxon";
import { EvaluationListItem } from "@/services/evaluation.service";
import { usePageContext } from "../context";
import { useSearchParams } from "next/navigation";

interface EvaluationsTableProps {
  evaluations: EvaluationListItem[];
  currentPage: number;
  currentPageSize: number;
  modelName: string;
  total: number;
}

export function EvaluationsTable({
  evaluations,
  currentPage,
  currentPageSize,
  modelName,
  total,
}: EvaluationsTableProps) {
  const searchParams = useSearchParams();
  const pageContext = usePageContext();

  // Helper function to build filter parameters for inspect page
  const buildInspectParams = (evaluationIndex: number) => {
    const params = new URLSearchParams();

    // Add current filters from the leaderboard page
    if (pageContext.filters.context) {
      if (pageContext.filters.context.type === "promptSet") {
        params.set(
          `evaluation-${evaluationIndex + 1}-promptSetTitle`,
          pageContext.filters.context.label
        );
      } else if (pageContext.filters.context.type === "protocol") {
        params.set(
          `evaluation-${evaluationIndex + 1}-protocolName`,
          pageContext.filters.context.label
        );
      }
    }

    if (pageContext.filters.provider) {
      params.set(
        `evaluation-${evaluationIndex + 1}-provider`,
        pageContext.filters.provider.label
      );
    }

    if (pageContext.filters.promptType) {
      params.set(
        `evaluation-${evaluationIndex + 1}-promptType`,
        pageContext.filters.promptType.value
      );
    }

    if (searchParams.has("protocol")) {
      // For ForestAI we need to filter based on the provider
      params.set(`evaluation-${evaluationIndex + 1}-provider`, modelName);
    }

    if (searchParams.has("promptSet")) {
      params.set(`evaluation-${evaluationIndex + 1}-modelName`, modelName);
    }

    return params;
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Provider(s)</TableHead>
              <TableHead className="w-[180px]">Started at</TableHead>
              <TableHead className="w-[200px]">Finished at</TableHead>
              <TableHead className="w-[100px]">Context</TableHead>
              <TableHead className="w-[80px]">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {evaluations.map((evaluation, i) => (
              <TableRow
                key={i}
                data-disabled={pageContext.isRouting}
                onClick={() => {
                  const filterParams = buildInspectParams(evaluation.index);
                  pageContext.navigate(
                    `/inspect/${evaluation.fileCID}?${filterParams.toString()}`
                  );
                }}
                className="data-[disabled=true]:cursor-progress data-[disabled=true]:hover:bg-gray-100 data-[disabled=true]:bg-gray-100 cursor-pointer hover:bg-gray-50 border-b border-gray-200"
              >
                <TableCell>{evaluation.providers.join(", ")}</TableCell>
                <TableCell>
                  {DateTime.fromJSDate(evaluation.startedAt).toFormat(
                    "TTT, DD"
                  )}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {evaluation.finishedAt
                    ? DateTime.fromJSDate(evaluation.finishedAt).toFormat(
                        "TTT, DD"
                      )
                    : "Not completed"}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {evaluation.promptSetTitle || evaluation.protocolName}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {evaluation.score}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Pagination
        currentPage={currentPage}
        pageSize={currentPageSize}
        totalItemCount={total}
        disabled={pageContext.isRouting}
        onPageSizeChange={(pageSize) =>
          pageContext.navigate(`?page=1&pageSize=${pageSize}`)
        }
        onPageChange={(page) =>
          pageContext.navigate(`?page=${page}&pageSize=${currentPageSize}`)
        }
      />
    </div>
  );
}
