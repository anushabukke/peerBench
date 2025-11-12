"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/utils/cn";
import { usePromptSearchFiltersContext } from "../context";
import { LucideX, LucideEye } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ReviewStatusFilter({
  className,
  disabled = false,
}: {
  className?: string;
  disabled?: boolean;
}) {
  const ctx = usePromptSearchFiltersContext();

  const handleExcludeReviewedChange = (checked: boolean) => {
    ctx.updateFilters({
      excludeReviewed: checked,
      onlyReviewed: checked ? false : ctx.filters.onlyReviewed.value,
    });
  };
  const handleOnlyReviewedChange = (checked: boolean) => {
    ctx.updateFilters({
      excludeReviewed: checked ? false : ctx.filters.excludeReviewed.value,
      onlyReviewed: checked,
    });
  };

  const clear = () => {
    ctx.updateFilters({
      excludeReviewed: false,
      onlyReviewed: false,
    });
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs font-medium text-gray-400">
          <LucideEye size={14} />
          Review Status
        </label>
        {!disabled &&
          (ctx.filters.excludeReviewed.value ||
            ctx.filters.onlyReviewed.value) && (
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
      <div className="flex flex-col flex-wrap gap-3 justify-center">
        {[
          {
            label: "Exclude Reviewed By Me",
            searchParamKey: "excludeReviewed",
            value: ctx.filters.excludeReviewed.value,
            onChange: handleExcludeReviewedChange,
          },
          {
            label: "Only Reviewed By Me",
            searchParamKey: "onlyReviewed",
            value: ctx.filters.onlyReviewed.value,
            onChange: handleOnlyReviewedChange,
          },
        ].map((option, index) => (
          <div className="flex items-center space-x-3" key={index}>
            <Checkbox
              id={option.searchParamKey}
              checked={option.value}
              onCheckedChange={option.onChange}
              disabled={disabled}
            />
            <label
              htmlFor={option.searchParamKey}
              className={cn("text-sm font-medium cursor-pointer")}
            >
              {option.label}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
