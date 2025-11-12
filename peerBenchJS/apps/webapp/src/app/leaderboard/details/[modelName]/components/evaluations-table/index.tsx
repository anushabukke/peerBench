import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DateTime } from "luxon";
import { getEvaluationsList } from "../../actions/get-evaluations-list";
import EvaluationsTablePagination from "./pagination";
import Link from "next/link";

export interface EvaluationsTableProps {
  modelName: string;
  promptSetId?: number;
  protocolAddress?: string;

  page: number;
  pageSize: number;
  promptType?: string;
  provider?: string;
}

export default async function EvaluationsTable({
  modelName,
  promptSetId,
  protocolAddress,
  page,
  pageSize,
  promptType,
  provider,
}: EvaluationsTableProps) {
  const result = await getEvaluationsList({
    model: modelName,
    page,
    pageSize,
    promptSetId,
    protocolAddress,
    promptType,
    provider,
  });

  if (result.error) {
    return <div>Error: {result.error}</div>;
  }

  const evaluations = result.data!.data;
  const totalEvaluations = result.data!.totalCount;

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
              <TableHead className="w-[10px]">Link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {evaluations.map((evaluation, i) => (
              <TableRow
                key={i}
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
                <TableCell className="font-mono text-sm">
                  <Link
                    href={`/inspect/${evaluation.fileCID}`}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Inspect
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EvaluationsTablePagination
        page={page}
        pageSize={pageSize}
        totalEvaluations={totalEvaluations}
      />
    </div>
  );
}
