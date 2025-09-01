"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTestResultFilterValues } from "@/lib/actions/get-test-result-filter-values";
import { X, ChevronDown, SlidersHorizontal } from "lucide-react";
import { DualRangeSlider } from "@/components/ui/dual-range-slider";
import { cn } from "@/lib/utils";
import { useDebouncedCallback } from "use-debounce";
import { capitalize } from "@/utils/capitalize";

export type TestResultFilterValues = {
  testName: string | null;
  provider: string | null;
  modelName: string | null;
  promptType: string | null;
  promptSetTitle: string | null;
  isSuccess: boolean | null;
  scoreStrategy: string | null;
  replaceEntityStrategy: string | null;
  paragraphMergeStrategy: string | null;
  pickTextStrategy: string | null;
  typoDifficulty: string | null;
  minScore: number;
  maxScore: number;
};

interface TestResultFiltersProps {
  evaluationId: number;
  initialFilters?: TestResultFilterValues;
  onFiltersChange: (filters: TestResultFilterValues) => void;
}

export default function TestResultFilters({
  evaluationId,
  initialFilters,
  onFiltersChange,
}: TestResultFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filterValues, setFilterValues] = useState<{
    testNames: string[];
    providers: string[];
    modelNames: string[];
    promptTypes: string[];
    promptSetTitles: string[];
    scoreRange: { min: number; max: number };
    scoreStrategies: string[];
    replaceEntityStrategies: string[];
    paragraphMergeStrategies: string[];
    pickTextStrategies: string[];
    typoDifficulties: string[];
  } | null>(null);
  const [isLoading, startLoading] = useTransition();
  const [filters, setFilters] = useState<TestResultFilterValues>(
    initialFilters || {
      testName: null,
      provider: null,
      modelName: null,
      promptType: null,
      promptSetTitle: null,
      isSuccess: null,
      minScore: 0,
      maxScore: 1,
      scoreStrategy: null,
      replaceEntityStrategy: null,
      paragraphMergeStrategy: null,
      pickTextStrategy: null,
      typoDifficulty: null,
    }
  );

  useEffect(() => {
    startLoading(async () => {
      try {
        const values = await getTestResultFilterValues({ evaluationId });
        setFilterValues(values);
      } catch (error) {
        console.error("Failed to load filter values:", error);
      }
    });
  }, [evaluationId]);

  const debounceOnFiltersChange = useDebouncedCallback(
    (newFilters: TestResultFilterValues) => {
      onFiltersChange(newFilters);
    },
    500
  );

  const handleFilterChange = (
    keys: keyof typeof filters | (keyof typeof filters)[],
    values:
      | string
      | number
      | boolean
      | null
      | (string | number | boolean | null)[]
  ) => {
    const newFilters = { ...filters };
    if (Array.isArray(keys)) {
      if (!Array.isArray(values)) {
        throw new Error("Value must be an array if key is an array");
      }

      keys.forEach((key, index) => {
        newFilters[key as keyof typeof filters] = (
          values as (string | number | boolean | null)[]
        )[index] as never;
      });
    } else {
      newFilters[keys as keyof typeof filters] = values as never;
    }

    setFilters(newFilters);

    // If the updated filter is score range, we need to use debounced version
    // to not to trigger the onFiltersChange too often.
    const isScoreRangeFilter = Array.isArray(keys)
      ? keys.includes("minScore") || keys.includes("maxScore")
      : keys === "minScore" || keys === "maxScore";

    if (isScoreRangeFilter) {
      debounceOnFiltersChange(newFilters);
    } else {
      onFiltersChange(newFilters);
    }
  };

  const clearFilters = () => {
    const clearedFilters = {
      testName: null,
      provider: null,
      modelName: null,
      promptType: null,
      promptSetTitle: null,
      isSuccess: null,
      scoreStrategy: null,
      replaceEntityStrategy: null,
      paragraphMergeStrategy: null,
      pickTextStrategy: null,
      typoDifficulty: null,
      minScore: 0,
      maxScore: 1,
    };
    setFilters(clearedFilters);
    debounceOnFiltersChange(clearedFilters);
  };

  const hasActiveFilters = filters
    ? Object.entries(filters).some(([key, value]) => {
        if (key === "minScore" || key === "maxScore") {
          return value !== 0 && value !== 1;
        }

        return value !== null && value !== "";
      })
    : false;

  const activeFilterCount = filters
    ? Object.entries(filters).filter(([key, value]) => {
        if (value === null || value === "") {
          return false;
        }

        if (key === "minScore" || key === "maxScore") {
          return value !== 0 && value !== 1;
        }

        return true;
      }).length
    : 0;

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
                      clearFilters();
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
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                  Loading filter options...
                </div>
              </div>
            ) : filterValues ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Test Name Filter */}
                {(filterValues?.testNames.length || 0) > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Test Name
                    </label>
                    <Select
                      value={filters?.testName || "all"}
                      onValueChange={(value) =>
                        handleFilterChange(
                          "testName",
                          value === "all" ? null : value
                        )
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Test Names" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Test Names</SelectItem>
                        {filterValues!.testNames.map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Provider Filter */}
                {(filterValues?.providers.length || 0) > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Provider
                    </label>
                    <Select
                      value={filters?.provider || "all"}
                      onValueChange={(value) =>
                        handleFilterChange(
                          "provider",
                          value === "all" ? null : value
                        )
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Providers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Providers</SelectItem>
                        {filterValues!.providers.map((provider) => (
                          <SelectItem key={provider} value={provider}>
                            {provider}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Model Name Filter */}
                {(filterValues?.modelNames.length || 0) > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Model Name
                    </label>
                    <Select
                      value={filters?.modelName || "all"}
                      onValueChange={(value) =>
                        handleFilterChange(
                          "modelName",
                          value === "all" ? null : value
                        )
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Models" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Models</SelectItem>
                        {filterValues!.modelNames.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Prompt Type Filter */}
                {(filterValues?.promptTypes.length || 0) > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Prompt Type
                    </label>
                    <Select
                      value={filters?.promptType || "all"}
                      onValueChange={(value) =>
                        handleFilterChange(
                          "promptType",
                          value === "all" ? null : value
                        )
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Prompt Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Prompt Types</SelectItem>
                        {filterValues!.promptTypes.map((promptType) => (
                          <SelectItem key={promptType} value={promptType}>
                            {promptType
                              .split("-")
                              .map((word) => capitalize(word))
                              .join(" ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Prompt Set Title Filter */}
                {(filterValues?.promptSetTitles.length || 0) > 1 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Prompt Set Title
                    </label>
                    <Select
                      value={filters?.promptSetTitle || "all"}
                      onValueChange={(value) =>
                        handleFilterChange(
                          "promptSetTitle",
                          value === "all" ? null : value
                        )
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Prompt Set Titles" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          All Prompt Set Titles
                        </SelectItem>
                        {filterValues!.promptSetTitles.map((promptSetTitle) => (
                          <SelectItem
                            key={promptSetTitle}
                            value={promptSetTitle}
                          >
                            {promptSetTitle}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Score Strategy Filter */}
                {(filterValues?.scoreStrategies.length || 0) > 1 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Score Strategy
                    </label>

                    <Select
                      value={filters?.scoreStrategy || "all"}
                      onValueChange={(value) =>
                        handleFilterChange(
                          "scoreStrategy",
                          value === "all" ? null : value
                        )
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Score Strategies" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          All Score Strategies
                        </SelectItem>
                        {filterValues!.scoreStrategies.map((scoreStrategy) => (
                          <SelectItem key={scoreStrategy} value={scoreStrategy}>
                            {scoreStrategy
                              .split("-")
                              .map((word) => capitalize(word))
                              .join(" ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Replace Entity Strategy Filter */}
                {(filterValues?.replaceEntityStrategies.length || 0) > 1 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Replace Entity Strategy
                    </label>
                    <Select
                      value={filters?.replaceEntityStrategy || "all"}
                      onValueChange={(value) =>
                        handleFilterChange(
                          "replaceEntityStrategy",
                          value === "all" ? null : value
                        )
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Replace Entity Strategies" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          All Replace Entity Strategies
                        </SelectItem>
                        {filterValues!.replaceEntityStrategies.map(
                          (replaceEntityStrategy) => (
                            <SelectItem
                              key={replaceEntityStrategy}
                              value={replaceEntityStrategy}
                            >
                              {replaceEntityStrategy
                                .split("-")
                                .map((word) => capitalize(word))
                                .join(" ")}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Paragraph Merge Strategy Filter */}
                {(filterValues?.paragraphMergeStrategies.length || 0) > 1 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Paragraph Merge Strategy
                    </label>
                    <Select
                      value={filters?.paragraphMergeStrategy || "all"}
                      onValueChange={(value) =>
                        handleFilterChange(
                          "paragraphMergeStrategy",
                          value === "all" ? null : value
                        )
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Paragraph Merge Strategies" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          All Paragraph Merge Strategies
                        </SelectItem>
                        {filterValues!.paragraphMergeStrategies.map(
                          (paragraphMergeStrategy) => (
                            <SelectItem
                              key={paragraphMergeStrategy}
                              value={paragraphMergeStrategy}
                            >
                              {paragraphMergeStrategy
                                .split("-")
                                .map((word) => capitalize(word))
                                .join(" ")}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Pick Text Strategy Filter */}
                {(filterValues?.pickTextStrategies.length || 0) > 1 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Pick Text Strategy
                    </label>
                    <Select
                      value={filters?.pickTextStrategy || "all"}
                      onValueChange={(value) =>
                        handleFilterChange(
                          "pickTextStrategy",
                          value === "all" ? null : value
                        )
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Pick Text Strategies" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          All Pick Text Strategies
                        </SelectItem>
                        {filterValues!.pickTextStrategies.map(
                          (pickTextStrategy) => (
                            <SelectItem
                              key={pickTextStrategy}
                              value={pickTextStrategy}
                            >
                              {pickTextStrategy
                                .split("-")
                                .map((word) => capitalize(word))
                                .join(" ")}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Typo Difficulty Filter */}
                {(filterValues?.typoDifficulties.length || 0) > 1 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Typo Difficulty
                    </label>
                    <Select
                      value={filters?.typoDifficulty || "all"}
                      onValueChange={(value) =>
                        handleFilterChange(
                          "typoDifficulty",
                          value === "all" ? null : value
                        )
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Typo Difficulties" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          All Typo Difficulties
                        </SelectItem>
                        {filterValues!.typoDifficulties.map(
                          (typoDifficulty) => (
                            <SelectItem
                              key={typoDifficulty}
                              value={typoDifficulty}
                            >
                              {typoDifficulty
                                .split("-")
                                .map((word) => capitalize(word))
                                .join(" ")}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Success Status Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Status
                  </label>
                  <Select
                    value={
                      filters?.isSuccess === undefined ||
                      filters?.isSuccess === null
                        ? "all"
                        : filters?.isSuccess.toString()
                    }
                    onValueChange={(value) => {
                      handleFilterChange(
                        "isSuccess",
                        value === "all" ? null : value === "true"
                      );
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Results" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Results</SelectItem>
                      <SelectItem value="true">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          Success
                        </div>
                      </SelectItem>
                      <SelectItem value="false">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          Failed
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Score Range Filter */}
                {filterValues?.scoreRange && (
                  <div className="space-y-2 md:col-span-2 lg:col-span-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Score Range
                    </label>
                    <div className="p-4">
                      <DualRangeSlider
                        labelPosition="bottom"
                        label={(value) => value?.toFixed(2)}
                        min={0}
                        max={1}
                        step={0.01}
                        value={[filters.minScore, filters.maxScore]}
                        onValueChange={([min, max]: [number, number]) => {
                          handleFilterChange(
                            ["minScore", "maxScore"],
                            [min, max]
                          );
                        }}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  No filter options available
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
