"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePromptSearchFiltersContext } from "@/components/prompt-search-filters/context";
import { useDebounce } from "@/lib/hooks/use-debounce";
import type { RequestQueryParams as GetCuratedLeaderboardRequestQueryParams } from "@/app/api/v2/leaderboard/curated/get";
import { useQuery } from "@tanstack/react-query";
import LoadingSpinner from "@/components/loading-spinner";
import { errorMessage } from "@/utils/error-message";
import { useLeaderboardApi } from "@/lib/hooks/use-leaderboard-api";

export interface CuratedLeaderboardData {
  modelProvider: string;
  modelName: string;
  modelId: number;
  avgScore: number;
  totalScores: number;
  uniquePrompts: number;
  avgResponseTime: number | string | null;
}

export interface CuratedLeaderboardStats {
  totalDistinctPrompts: number;
  totalResponses: number;
  totalScores: number;
}

export interface PromptSetDistribution {
  promptSetId: number;
  promptSetTitle: string;
  promptCount: number;
}

export function CuratedLeaderboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { filters, fixedFilters, isAnyFilterApplied } =
    usePromptSearchFiltersContext();
  const debouncedFilters = useDebounce(filters, 500);
  const [showAll, setShowAll] = useState(false);
  const leaderboardApi = useLeaderboardApi();

  // Read minCoverage from URL or default to "50"
  const [minCoverage, setMinCoverageState] = useState<string>(
    () => searchParams.get("minCoverage") || "50"
  );

  // Read showResponseTime from URL or default to false
  const [showResponseTime, setShowResponseTimeState] = useState<boolean>(
    () => searchParams.get("showResponseTime") === "true"
  );

  // Read prompt age filters from URL
  const [promptAgeWeighting, setPromptAgeWeightingState] = useState<string>(
    () => searchParams.get("promptAgeWeighting") || "none"
  );
  const [responseDelayWeighting, setResponseDelayWeightingState] =
    useState<string>(
      () => searchParams.get("responseDelayWeighting") || "none"
    );

  // Sync state with URL params when URL changes
  useEffect(() => {
    const urlMinCoverage = searchParams.get("minCoverage") || "50";
    if (urlMinCoverage !== minCoverage) {
      setMinCoverageState(urlMinCoverage);
    }

    const urlShowResponseTime = searchParams.get("showResponseTime") === "true";
    if (urlShowResponseTime !== showResponseTime) {
      setShowResponseTimeState(urlShowResponseTime);
    }

    const urlPromptAgeWeighting =
      searchParams.get("promptAgeWeighting") || "none";
    if (urlPromptAgeWeighting !== promptAgeWeighting) {
      setPromptAgeWeightingState(urlPromptAgeWeighting);
    }

    const urlResponseDelayWeighting =
      searchParams.get("responseDelayWeighting") || "none";
    if (urlResponseDelayWeighting !== responseDelayWeighting) {
      setResponseDelayWeightingState(urlResponseDelayWeighting);
    }
  }, [
    searchParams,
    minCoverage,
    showResponseTime,
    promptAgeWeighting,
    responseDelayWeighting,
  ]);

  // Update URL when minCoverage changes
  const setMinCoverage = (value: string) => {
    setMinCoverageState(value);
    const params = new URLSearchParams(searchParams.toString());
    params.set("minCoverage", value);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // Update URL when showResponseTime changes
  const setShowResponseTime = (value: boolean) => {
    setShowResponseTimeState(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("showResponseTime", "true");
    } else {
      params.delete("showResponseTime");
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const setPromptAgeWeighting = (value: string) => {
    setPromptAgeWeightingState(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value === "none") {
      params.delete("promptAgeWeighting");
    } else {
      params.set("promptAgeWeighting", value);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const setResponseDelayWeighting = (value: string) => {
    setResponseDelayWeightingState(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value === "none") {
      params.delete("responseDelayWeighting");
    } else {
      params.set("responseDelayWeighting", value);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const queryParams = useMemo(() => {
    const params = {
      promptSetId:
        fixedFilters?.promptSetId !== undefined
          ? [fixedFilters.promptSetId]
          : debouncedFilters.promptSetId?.value?.value !== undefined
            ? [debouncedFilters.promptSetId.value.value]
            : undefined,
      type: debouncedFilters.type.value?.map((type) => type.value),
      tags: debouncedFilters.tags?.value?.map((tag) => tag.value),
      uploaderId: debouncedFilters.uploaderId?.value,
      status: debouncedFilters.status?.value || undefined,
      reviewedByUserId: debouncedFilters.reviewedByUserId?.value || undefined,
      excludeReviewedByUserId:
        debouncedFilters.excludeReviewedByUserId?.value || undefined,
      minScoreCount: debouncedFilters.minScoreCount?.value || undefined,
      maxScoreCount: debouncedFilters.maxScoreCount?.value || undefined,
      minBadScoreCount: debouncedFilters.minBadScoreCount?.value || undefined,
      maxBadScoreCount: debouncedFilters.maxBadScoreCount?.value || undefined,
      badScoreThreshold: debouncedFilters.badScoreThreshold?.value || undefined,
      minGoodScoreCount: debouncedFilters.minGoodScoreCount?.value || undefined,
      maxGoodScoreCount: debouncedFilters.maxGoodScoreCount?.value || undefined,
      goodScoreThreshold:
        debouncedFilters.goodScoreThreshold?.value || undefined,
      minReviewsCount: debouncedFilters.minReviewsCount?.value || undefined,
      maxReviewsCount: debouncedFilters.maxReviewsCount?.value || undefined,
      minPositiveReviewsCount:
        debouncedFilters.minPositiveReviewsCount?.value || undefined,
      maxPositiveReviewsCount:
        debouncedFilters.maxPositiveReviewsCount?.value || undefined,
      minNegativeReviewsCount:
        debouncedFilters.minNegativeReviewsCount?.value || undefined,
      maxNegativeReviewsCount:
        debouncedFilters.maxNegativeReviewsCount?.value || undefined,
      maxAvgScore: debouncedFilters.maxAvgScore?.value || undefined,
      minAvgScore: debouncedFilters.minAvgScore?.value || undefined,
      minCoverage: minCoverage !== "0" ? parseFloat(minCoverage) : undefined,
      modelSlugs: debouncedFilters.modelSlugs?.value || undefined,
      maxPromptAgeDays:
        debouncedFilters.maxPromptAgeDays?.value?.value || undefined,
      promptAgeWeighting:
        promptAgeWeighting !== "none"
          ? (promptAgeWeighting as "linear" | "exponential")
          : undefined,
      responseDelayWeighting:
        responseDelayWeighting !== "none"
          ? (responseDelayWeighting as "linear" | "exponential")
          : undefined,
      maxGapToFirstResponse:
        debouncedFilters.maxGapToFirstResponse?.value || undefined,
    } as unknown as GetCuratedLeaderboardRequestQueryParams;

    console.log("Curated Leaderboard Query Params:", params);
    return params;
  }, [
    debouncedFilters,
    fixedFilters,
    minCoverage,
    promptAgeWeighting,
    responseDelayWeighting,
  ]);

  // Check if any local filters (coverage, age, etc.) are applied
  const hasLocalFilters =
    minCoverage !== "50" ||
    promptAgeWeighting !== "none" ||
    responseDelayWeighting !== "none";

  const { data, isLoading, error } = useQuery({
    queryKey: ["curated-leaderboard", queryParams],
    queryFn: () => leaderboardApi.getCuratedLeaderboard(queryParams),
    enabled: isAnyFilterApplied || hasLocalFilters,
  });

  const leaderboardData = data?.data ?? [];
  const stats = data?.stats;

  // Split data into top 5 and remaining models
  const topModels = leaderboardData.slice(0, 5);
  const remainingModels = leaderboardData.slice(5);

  // Helper function to render table rows
  const renderTableRow = (entry: CuratedLeaderboardData, index: number) => {
    const coverage = stats?.totalDistinctPrompts
      ? (entry.uniquePrompts / stats.totalDistinctPrompts) * 100
      : 0;

    return (
      <TableRow
        key={entry.modelId}
        className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
      >
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
            {entry.modelName}
          </span>
        </TableCell>
        <TableCell className="text-right">
          <span className="font-bold text-lg text-gray-900 dark:text-gray-100">
            {(entry.avgScore * 100).toFixed(1)}%
          </span>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1.5">
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              {entry.uniquePrompts}
            </span>
          </div>
        </TableCell>
        <TableCell className="text-right">
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            {coverage.toFixed(1)}%
          </span>
        </TableCell>
        {showResponseTime && (
          <TableCell className="text-right">
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              {entry.avgResponseTime !== null &&
              entry.avgResponseTime !== undefined
                ? `${Number(entry.avgResponseTime).toFixed(2)}s`
                : "N/A"}
            </span>
          </TableCell>
        )}
      </TableRow>
    );
  };

  // Show message if no filters are applied
  if (!isAnyFilterApplied && !hasLocalFilters) {
    return (
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <CardContent className="p-8 text-center text-slate-600 dark:text-slate-400">
          <p className="text-lg font-medium mb-2">
            Apply filters to see the leaderboard
          </p>
          <p className="text-sm">
            Use the filter options below to customize your leaderboard view.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Render empty state content for leaderboard area
  const renderLeaderboardContent = () => {
    if (isLoading) {
      return (
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="p-12 flex justify-center items-center">
            <LoadingSpinner />
          </CardContent>
        </Card>
      );
    }

    if (error) {
      return (
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="p-6 text-center text-red-600 dark:text-red-400">
            <p>Error loading leaderboard: {errorMessage(error)}</p>
          </CardContent>
        </Card>
      );
    }

    if (leaderboardData.length === 0) {
      return (
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="p-6 text-center text-slate-600 dark:text-slate-400">
            <p>No leaderboard data available for the selected filters.</p>
            <p className="text-sm mt-2">
              Try adjusting your filters below to see model evaluations.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <>
        {leaderboardData.length === 0 ? (
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="p-6 text-center text-slate-600 dark:text-slate-400">
              <p>No models match the coverage filter criteria.</p>
              <p className="text-sm mt-2">
                Try lowering the minimum coverage percentage to see more models.
              </p>
            </CardContent>
          </Card>
        ) : (
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
                      Coverage
                    </TableHead>
                    {showResponseTime && (
                      <TableHead className="text-right font-semibold text-gray-700 dark:text-gray-300">
                        Avg. Response Time
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topModels.map((entry, index) =>
                    renderTableRow(entry, index)
                  )}
                  {showAll &&
                    remainingModels.map((entry, index) =>
                      renderTableRow(entry, topModels.length + index)
                    )}
                </TableBody>
              </Table>
            </div>
            {remainingModels.length > 0 && (
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
                      Show all ({leaderboardData.length} models)
                    </>
                  )}
                </Button>
              </div>
            )}
          </Card>
        )}
      </>
    );
  };

  return (
    <div className="space-y-4 w-full mb-3">
      {/* Leaderboard */}
      {renderLeaderboardContent()}

      {/* Coverage Filter and Display Options */}
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-4">
              <label
                htmlFor="coverage-filter"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
              >
                Min. Prompt Coverage:
              </label>
              <Select value={minCoverage} onValueChange={setMinCoverage}>
                <SelectTrigger
                  id="coverage-filter"
                  className="w-[180px] bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                >
                  <SelectValue placeholder="All models" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">All models (0%)</SelectItem>
                  <SelectItem value="50">50% or more</SelectItem>
                  <SelectItem value="70">70% or more</SelectItem>
                  <SelectItem value="80">80% or more</SelectItem>
                  <SelectItem value="90">90% or more</SelectItem>
                  <SelectItem value="100">100% only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="show-response-time"
                checked={showResponseTime}
                onChange={(e) => setShowResponseTime(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <label
                htmlFor="show-response-time"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
              >
                Show Avg. Response Time
              </label>
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Showing {leaderboardData.length} models
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Prompt Age Filters */}
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <CardContent className="p-4">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Prompt Age Filtering
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Prompt Age Weighting */}
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="prompt-age-weighting"
                  className="text-xs text-gray-600 dark:text-gray-400"
                >
                  Prompt Age Weighting:
                </label>
                <Select
                  value={promptAgeWeighting}
                  onValueChange={setPromptAgeWeighting}
                >
                  <SelectTrigger
                    id="prompt-age-weighting"
                    className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="linear">Linear</SelectItem>
                    <SelectItem value="exponential">Exponential</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-[10px] text-gray-500 dark:text-gray-500">
                  Downscale scores of older prompts
                </span>
              </div>

              {/* Response Delay Weighting */}
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="response-delay-weighting"
                  className="text-xs text-gray-600 dark:text-gray-400"
                >
                  Response Delay Weighting:
                </label>
                <Select
                  value={responseDelayWeighting}
                  onValueChange={setResponseDelayWeighting}
                >
                  <SelectTrigger
                    id="response-delay-weighting"
                    className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="linear">Linear</SelectItem>
                    <SelectItem value="exponential">Exponential</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-[10px] text-gray-500 dark:text-gray-500">
                  Downrank responses with long delays
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Display */}
      {stats && !isLoading && !error && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Distinct Prompts
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.totalDistinctPrompts.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Responses
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.totalResponses.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Scores
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.totalScores.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
