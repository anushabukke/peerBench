"use client";

import { cn } from "@/utils/cn";
import { usePromptSearchFiltersContext } from "../context";
import { LucideCheck, LucideX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PromptStatuses } from "@/database/types";

export default function PromptStatusFilter({
  className,
  disabled = false,
}: {
  className?: string;
  disabled?: boolean;
}) {
  const ctx = usePromptSearchFiltersContext();

  const handleStatusChange = (status: string) => {
    // If clicking the same status, clear the filter (show all)
    if (ctx.filters.status.value === status) {
      ctx.updateFilters({ status: "" });
    } else {
      ctx.updateFilters({ status });
    }
  };

  const clear = () => {
    ctx.updateFilters({ status: "" });
  };

  if (disabled) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs font-medium text-gray-400">
          Prompt Status
        </label>
        {ctx.filters.status.value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clear}
            className="w-fit h-fit p-0 dark:hover:bg-gray-800"
          >
            <LucideX size={10} />
          </Button>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant={
            ctx.filters.status.value === PromptStatuses.included
              ? "default"
              : "outline"
          }
          size="sm"
          onClick={() => handleStatusChange(PromptStatuses.included)}
          className="flex-1 flex items-center gap-2"
        >
          <LucideCheck size={14} />
          Included
        </Button>
        <Button
          type="button"
          variant={
            ctx.filters.status.value === PromptStatuses.excluded
              ? "default"
              : "outline"
          }
          size="sm"
          onClick={() => handleStatusChange(PromptStatuses.excluded)}
          className="flex-1 flex items-center gap-2"
        >
          <LucideX size={14} />
          Excluded
        </Button>
      </div>
    </div>
  );
}

