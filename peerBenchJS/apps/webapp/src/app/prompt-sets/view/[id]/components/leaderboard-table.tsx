"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { LeaderboardRow } from "./leaderboard-row";
import type { GetPromptSetLeaderboardReturnItem } from "@/services/promptset.service";

export interface LeaderboardTableProps {
  data: GetPromptSetLeaderboardReturnItem[];
  totalPromptsInSet: number;
}

export function LeaderboardTable({
  data,
  totalPromptsInSet,
}: LeaderboardTableProps) {
  const [showAll, setShowAll] = useState(false);

  // Calculate 70% threshold
  const threshold = totalPromptsInSet * 0.7;

  // Split data into top 5 and remaining models
  const topModels = data.slice(0, 5);

  if (data.length === 0) {
    return (
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <CardContent className="p-6 text-center text-slate-600 dark:text-slate-400">
          <p>No leaderboard data available for this Benchmark yet.</p>
          <p className="text-sm mt-2">
            Model evaluations will appear here once tests are run.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-slate-700 hover:!bg-gray-50 dark:hover:!bg-slate-700">
              <TableHead className="w-[80px] font-semibold text-gray-700 dark:text-gray-300">
                Rank
              </TableHead>
              <TableHead className="font-semibold text-gray-700 dark:text-gray-300">
                Model
              </TableHead>
              <TableHead className="text-right font-semibold text-gray-700 dark:text-gray-300">
                Avg. Score
              </TableHead>
              <TableHead className="text-right font-semibold text-gray-700 dark:text-gray-300">
                Prompts Tested
              </TableHead>
              <TableHead className="text-right font-semibold text-gray-700 dark:text-gray-300">
                Avg. Response Time
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(showAll ? data : topModels).map((entry, index) => (
              <LeaderboardRow
                key={entry.model}
                {...entry}
                index={index}
                uniquePromptThreshold={threshold}
              />
            ))}
          </TableBody>
        </Table>
      </div>
      {data.length - 5 > 0 && (
        <div className="border-t border-slate-200 dark:border-slate-700 p-3 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            {showAll ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Hide
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show all ({data.length} models)
              </>
            )}
          </Button>
        </div>
      )}
    </Card>
  );
}
