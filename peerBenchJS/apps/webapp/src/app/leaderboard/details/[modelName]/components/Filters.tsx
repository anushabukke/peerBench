"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, ChevronDown, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

import { usePageContext, FilterOptionType } from "../context";

// Generic Filter Select Component
const FilterSelect = ({
  label,
  placeholder,
  options,
  currentValue,
  onValueChange,
  onClear,
  disabled,
}: {
  label: string;
  placeholder: string;
  options: FilterOptionType[];
  currentValue: FilterOptionType | null;
  onValueChange: (value: FilterOptionType | null) => void;
  onClear: () => void;
  disabled: boolean;
}) => {
  if (options.length <= 1) return null;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <Select
          disabled={disabled}
          value={currentValue?.value ?? ""}
          onValueChange={(value) => {
            const selectedOption = options.find(
              (option) => option.value === value
            );
            onValueChange(selectedOption || null);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {currentValue && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={disabled}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default function Filters() {
  const pageContext = usePageContext();
  const [isExpanded, setIsExpanded] = useState(true);

  const filterConfigs = [
    {
      key: "context",
      label: "Context",
      placeholder: "All Contexts",
      options: pageContext.filterOptions.contexts,
      currentValue: pageContext.filters.context,
    },
    {
      key: "provider",
      label: "Provider",
      placeholder: "All Providers",
      options: pageContext.filterOptions.providers,
      currentValue: pageContext.filters.provider,
    },
    {
      key: "promptType",
      label: "Prompt Type",
      placeholder: "All Prompt Types",
      options: pageContext.filterOptions.promptTypes,
      currentValue: pageContext.filters.promptType,
    },
  ].filter((config) => config.options.length > 1);

  if (filterConfigs.length === 0) return null;

  // Check if any filters are active
  const hasActiveFilters = Object.values(pageContext.filters).some(
    (filter) => filter !== null
  );

  const activeFilterCount = Object.values(pageContext.filters).filter(
    (filter) => filter !== null
  ).length;

  // Clear all filters function
  const clearAllFilters = () => {
    const clearedFilters: Record<string, FilterOptionType | null> = {};
    filterConfigs.forEach((config) => {
      clearedFilters[config.key] = null;
    });
    pageContext.applyFilters(clearedFilters);
  };

  return (
    <Card className="shadow-none border border-gray-300 dark:border-gray-700">
      <CardHeader
        className="px-3 py-2 hover:cursor-pointer transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-t-lg"
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="select-none flex justify-between w-full items-center">
            <div className="text-lg font-semibold text-foreground flex items-center gap-2 w-full">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <SlidersHorizontal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              Filters
              {activeFilterCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                >
                  {activeFilterCount}
                </Badge>
              )}
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearAllFilters();
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-800"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
              <ChevronDown
                className={cn(
                  "w-6 h-6 text-gray-500 dark:text-gray-400 transition-transform",
                  isExpanded ? "transform rotate-180" : ""
                )}
              />
            </div>
          </CardTitle>
        </div>
      </CardHeader>

      <Collapsible open={isExpanded}>
        <CollapsibleContent>
          <CardContent className="mt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterConfigs.map((config) => (
                <FilterSelect
                  key={config.key}
                  label={config.label}
                  placeholder={config.placeholder}
                  options={config.options}
                  currentValue={config.currentValue}
                  onValueChange={(value) =>
                    pageContext.applyFilters({ [config.key]: value })
                  }
                  onClear={() =>
                    pageContext.applyFilters({ [config.key]: null })
                  }
                  disabled={pageContext.isRouting}
                />
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
