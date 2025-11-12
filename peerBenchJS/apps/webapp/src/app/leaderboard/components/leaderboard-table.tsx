import { Leaderboard } from "@/services/leaderboard.service";
import { LeaderboardTableRow } from "./leaderboard-table-row";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { capitalize } from "@/utils/capitalize";

export interface LeaderboardTableProps {
  data: Leaderboard;
}

export function LeaderboardTable({ data }: LeaderboardTableProps) {
  return (
    <Accordion
      key={data.context + data.promptType}
      type="single"
      collapsible
      className="rounded-lg border border-gray-200 shadow-lg overflow-hidden w-full"
    >
      <AccordionItem value="leaderboard" className="border-none">
        <AccordionTrigger className="px-6 py-4 hover:bg-gray-50 hover:no-underline bg-background">
          <div className="flex flex-col items-start gap-2">
            <h3 className="text-lg font-semibold text-gray-700">
              {data.context}
            </h3>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <Badge
                variant="default"
                className="text-xs bg-purple-100 text-purple-800 border-purple-200"
              >
                {data.entries.length}{" "}
                {data.promptSetId === null ? "providers" : "models"}
              </Badge>
              {data.promptSetId ? (
                <Badge
                  variant="default"
                  className="text-xs bg-blue-100 text-blue-800 border-blue-200"
                >
                  ID: {data.promptSetId}
                </Badge>
              ) : (
                <Badge
                  variant="default"
                  className="text-xs bg-yellow-200/60 text-yellow-800 border-yellow-300/80"
                >
                  Forest AI
                </Badge>
              )}
              {data.promptType && (
                <Badge
                  variant="default"
                  className="text-xs bg-green-100 text-green-800 border-green-200"
                >
                  {capitalize(data.promptType, true)}
                </Badge>
              )}
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <Table className="rounded-none">
              <TableHeader>
                <TableRow className="bg-gray-50 hover:!bg-gray-50">
                  <TableHead className="w-[80px] font-semibold text-gray-700">
                    Rank
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    Model
                  </TableHead>

                  {data.promptSetId !== null ? (
                    <>
                      <TableHead className="text-left font-semibold text-gray-700">
                        {data.promptType === "multiple-choice"
                          ? "Accuracy"
                          : "Avg. Score"}
                      </TableHead>
                      <TableHead className="text-right font-semibold text-gray-700">
                        Recent Evaluation
                      </TableHead>
                      <TableHead className="text-right font-semibold text-gray-700">
                        Unique Prompts
                      </TableHead>
                      <TableHead className="text-right font-semibold text-gray-700">
                        Total Evaluations
                      </TableHead>
                      <TableHead className="text-right font-semibold text-gray-700">
                        Total Prompts Sent
                      </TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead className="text-right font-semibold text-gray-700">
                        Avg. Score
                      </TableHead>
                      <TableHead className="text-right font-semibold text-gray-700">
                        Recent Evaluation
                      </TableHead>
                      <TableHead className="text-right font-semibold text-gray-700">
                        Total Evaluations
                      </TableHead>
                      <TableHead className="text-right font-semibold text-gray-700">
                        Total Tests Performed
                      </TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.entries.map((entry, index) => (
                  <LeaderboardTableRow
                    key={entry.model}
                    index={index}
                    entry={entry}
                    leaderboard={data}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
