import { TableCell, TableRow } from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LucideAlertCircle } from "lucide-react";
import type { GetPromptSetLeaderboardReturnItem } from "@/services/promptset.service";
import { formatMs } from "@peerbench/sdk";

export type LeaderboardRowProps = GetPromptSetLeaderboardReturnItem & {
  index: number;
  uniquePromptThreshold: number;
};

export function LeaderboardRow({
  index,
  model,
  avgScore,
  uniquePrompts,
  avgResponseTime,
  uniquePromptThreshold,
}: LeaderboardRowProps) {
  return (
    <TableRow className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          {index === 0 ? (
            <span className="text-lg" title="Gold Medal">
              🥇
            </span>
          ) : index === 1 ? (
            <span className="text-lg" title="Silver Medal">
              🥈
            </span>
          ) : index === 2 ? (
            <span className="text-lg" title="Bronze Medal">
              🥉
            </span>
          ) : null}
          {index + 1}
        </div>
      </TableCell>
      <TableCell>
        <span className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
          {model}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {avgScore.toFixed(2)}
        </span>
      </TableCell>
      <TableCell className="text-right text-gray-600 dark:text-gray-400">
        <div className="flex items-center justify-end gap-1.5">
          <span>{uniquePrompts}</span>
          {uniquePrompts < uniquePromptThreshold && (
            <Tooltip>
              <TooltipTrigger asChild>
                <LucideAlertCircle className="h-4 w-4 text-orange-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  This model tested fewer than 70% of Prompts (
                  {uniquePromptThreshold.toFixed(0)} required)
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right text-gray-600 dark:text-gray-400">
        {avgResponseTime ? `${formatMs(avgResponseTime)}` : "N/A"}
      </TableCell>
    </TableRow>
  );
}
