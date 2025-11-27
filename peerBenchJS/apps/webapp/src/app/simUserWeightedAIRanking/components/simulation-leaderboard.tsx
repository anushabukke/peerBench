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
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePromptSearchFiltersContext } from "@/components/prompt-search-filters/context";
import { useDebounce } from "@/lib/hooks/use-debounce";
import type { RequestQueryParams as GetSimUserWeightedLeaderboardRequestQueryParams } from "@/app/api/v2/leaderboard/simUserWeighted/get";
import { useQuery } from "@tanstack/react-query";
import LoadingSpinner from "@/components/loading-spinner";
import { errorMessage } from "@/utils/error-message";

export interface SimulationLeaderboardData {
  modelProvider: string;
  modelName: string;
  modelId: number;
  avgWeightedScore: number;
  avgOriginalScore: number;
  totalScores: number;
  uniquePrompts: number;
  avgResponseTime: number | string | null;
  avgUploaderScore: number;
}

export interface SimulationLeaderboardStats {
  totalDistinctPrompts: number;
  totalResponses: number;
  totalScores: number;
}

export interface PromptSetDistribution {
  promptSetId: number;
  promptSetTitle: string;
  promptCount: number;
}

async function fetchSimulationLeaderboard(
  params: GetSimUserWeightedLeaderboardRequestQueryParams
): Promise<{
  data: SimulationLeaderboardData[];
  stats: SimulationLeaderboardStats;
  promptSetDistribution: PromptSetDistribution[];
}> {
  const queryParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      if (Array.isArray(value)) {
        value.forEach((v) => queryParams.append(key, v.toString()));
      } else {
        queryParams.append(key, value.toString());
      }
    }
  });

  const url = `/api/v2/leaderboard/simUserWeighted?${queryParams.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch simulation leaderboard");
  }

  return response.json();
}

export function SimulationLeaderboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { filters, fixedFilters, isAnyFilterApplied } =
    usePromptSearchFiltersContext();
  const debouncedFilters = useDebounce(filters, 500);
  const [showAll, setShowAll] = useState(false);

  // User scoring algorithm selection
  const [userScoringAlgorithm, setUserScoringAlgorithmState] = useState<
    "simScores001" | "simScores002"
  >(() => (searchParams.get("userScoringAlgorithm") as any) || "simScores001");

  // User weight multiplier (0 to 2.0)
  const [userWeightMultiplier, setUserWeightMultiplierState] = useState<
    number
  >(() => parseFloat(searchParams.get("userWeightMultiplier") || "0"));

  // Read minCoverage from URL or default to "50"
  const [minCoverage, setMinCoverageState] = useState<string>(
    () => searchParams.get("minCoverage") || "50"
  );

  // Read showResponseTime from URL or default to false
  const [showResponseTime, setShowResponseTimeState] = useState<boolean>(
    () => searchParams.get("showResponseTime") === "true"
  );

  // Read prompt age filters from URL
  const [maxPromptAgeDays, setMaxPromptAgeDaysState] = useState<string>(
    () => searchParams.get("maxPromptAgeDays") || "all"
  );
  const [promptAgeWeighting, setPromptAgeWeightingState] = useState<string>(
    () => searchParams.get("promptAgeWeighting") || "none"
  );
  const [responseDelayWeighting, setResponseDelayWeightingState] =
    useState<string>(
      () => searchParams.get("responseDelayWeighting") || "none"
    );

  const [maxResponseDelayValue, setMaxResponseDelayValue] =
    useState<string>("");
  const [maxResponseDelayUnit, setMaxResponseDelayUnit] =
    useState<string>("seconds");
  const debouncedMaxResponseDelay = useDebounce(maxResponseDelayValue, 800);

  // Sync state with URL params when URL changes
  useEffect(() => {
    const urlUserScoringAlgorithm = searchParams.get("userScoringAlgorithm") as any || "simScores001";
    if (urlUserScoringAlgorithm !== userScoringAlgorithm) {
      setUserScoringAlgorithmState(urlUserScoringAlgorithm);
    }

    const urlUserWeightMultiplier = parseFloat(
      searchParams.get("userWeightMultiplier") || "0"
    );
    if (urlUserWeightMultiplier !== userWeightMultiplier) {
      setUserWeightMultiplierState(urlUserWeightMultiplier);
    }

    const urlMinCoverage = searchParams.get("minCoverage") || "50";
    if (urlMinCoverage !== minCoverage) {
      setMinCoverageState(urlMinCoverage);
    }

    const urlShowResponseTime = searchParams.get("showResponseTime") === "true";
    if (urlShowResponseTime !== showResponseTime) {
      setShowResponseTimeState(urlShowResponseTime);
    }

    const urlMaxPromptAgeDays = searchParams.get("maxPromptAgeDays") || "all";
    if (urlMaxPromptAgeDays !== maxPromptAgeDays) {
      setMaxPromptAgeDaysState(urlMaxPromptAgeDays);
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
    userScoringAlgorithm,
    userWeightMultiplier,
    minCoverage,
    showResponseTime,
    maxPromptAgeDays,
    promptAgeWeighting,
    responseDelayWeighting,
  ]);

  // Update URL when algorithm changes
  const setUserScoringAlgorithm = (value: "simScores001" | "simScores002") => {
    setUserScoringAlgorithmState(value);
    const params = new URLSearchParams(searchParams.toString());
    params.set("userScoringAlgorithm", value);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // Update URL when weight multiplier changes
  const setUserWeightMultiplier = (value: number) => {
    setUserWeightMultiplierState(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value === 0) {
      params.delete("userWeightMultiplier");
    } else {
      params.set("userWeightMultiplier", value.toString());
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // Update URL when minCoverage changes
  const setMinCoverage = (value: string) => {
    setMinCoverageState(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value === "0") {
      params.delete("minCoverage");
    } else {
      params.set("minCoverage", value);
    }
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

  // Update URL when prompt age filters change
  const setMaxPromptAgeDays = (value: string) => {
    setMaxPromptAgeDaysState(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("maxPromptAgeDays");
    } else {
      params.set("maxPromptAgeDays", value);
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
      userScoringAlgorithm,
      userWeightMultiplier,
      promptSetId:
        fixedFilters?.promptSetId !== undefined
          ? [fixedFilters.promptSetId]
          : debouncedFilters.promptSetId?.value?.value !== undefined
            ? [debouncedFilters.promptSetId.value.value]
            : undefined,
      type: debouncedFilters.type.value?.map((type) => type.value),
      tags: debouncedFilters.tags?.value,
      uploaderId: debouncedFilters.uploaderId?.value,
      status: debouncedFilters.status?.value || undefined,
      excludeReviewedByUserId:
        debouncedFilters.excludeReviewedByUserId?.value || undefined,
      reviewedByUserId: debouncedFilters.reviewedByUserId?.value,
      minScoreCount: debouncedFilters.minScoreCount?.value,
      maxScoreCount: debouncedFilters.maxScoreCount?.value,
      minBadScoreCount: debouncedFilters.minBadScoreCount?.value,
      maxBadScoreCount: debouncedFilters.maxBadScoreCount?.value,
      badScoreThreshold: debouncedFilters.badScoreThreshold?.value,
      minGoodScoreCount: debouncedFilters.minGoodScoreCount?.value,
      maxGoodScoreCount: debouncedFilters.maxGoodScoreCount?.value,
      goodScoreThreshold: debouncedFilters.goodScoreThreshold?.value,
      minReviewsCount: debouncedFilters.minReviewsCount?.value,
      maxReviewsCount: debouncedFilters.maxReviewsCount?.value,
      minPositiveReviewsCount: debouncedFilters.minPositiveReviewsCount?.value,
      maxPositiveReviewsCount: debouncedFilters.maxPositiveReviewsCount?.value,
      minNegativeReviewsCount: debouncedFilters.minNegativeReviewsCount?.value,
      maxNegativeReviewsCount: debouncedFilters.maxNegativeReviewsCount?.value,
      maxAvgScore: debouncedFilters.maxAvgScore?.value,
      minAvgScore: debouncedFilters.minAvgScore?.value,
      minCoverage: minCoverage !== "0" ? parseFloat(minCoverage) : undefined,
      modelSlugs: debouncedFilters.modelSlugs?.value || undefined,
      maxPromptAgeDays:
        maxPromptAgeDays !== "all" ? parseFloat(maxPromptAgeDays) : undefined,
      promptAgeWeighting:
        promptAgeWeighting !== "none"
          ? (promptAgeWeighting as "linear" | "exponential")
          : undefined,
      responseDelayWeighting:
        responseDelayWeighting !== "none"
          ? (responseDelayWeighting as "linear" | "exponential")
          : undefined,
      maxResponseDelaySeconds:
        debouncedMaxResponseDelay !== ""
          ? maxResponseDelayUnit === "days"
            ? parseFloat(debouncedMaxResponseDelay) * 86400
            : maxResponseDelayUnit === "microseconds"
              ? parseFloat(debouncedMaxResponseDelay) / 1000000
              : parseFloat(debouncedMaxResponseDelay)
          : undefined,
    } as unknown as GetSimUserWeightedLeaderboardRequestQueryParams;

    return params;
  }, [
    debouncedFilters,
    fixedFilters,
    userScoringAlgorithm,
    userWeightMultiplier,
    minCoverage,
    maxPromptAgeDays,
    promptAgeWeighting,
    responseDelayWeighting,
    debouncedMaxResponseDelay,
    maxResponseDelayUnit,
  ]);

  // Check if any local filters are applied
  const hasLocalFilters =
    minCoverage !== "50" ||
    maxPromptAgeDays !== "all" ||
    promptAgeWeighting !== "none" ||
    responseDelayWeighting !== "none" ||
    debouncedMaxResponseDelay !== "" ||
    userWeightMultiplier !== 0;

  const { data, isLoading, error } = useQuery({
    queryKey: ["sim-user-weighted-leaderboard", queryParams],
    queryFn: () => fetchSimulationLeaderboard(queryParams),
    enabled: isAnyFilterApplied || hasLocalFilters,
  });

  const leaderboardData = data?.data ?? [];
  const stats = data?.stats;

  // Split data into top 5 and remaining models
  const topModels = leaderboardData.slice(0, 5);
  const remainingModels = leaderboardData.slice(5);

  // Helper function to render table rows
  const renderTableRow = (entry: SimulationLeaderboardData, index: number) => {
    const coverage = stats?.totalDistinctPrompts
      ? (entry.uniquePrompts / stats.totalDistinctPrompts) * 100
      : 0;

    const scoreDiff =
      (entry.avgWeightedScore - entry.avgOriginalScore) * 100;

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
          <div className="flex flex-col items-end gap-0.5">
            <span className="font-bold text-lg text-gray-900 dark:text-gray-100">
              {(entry.avgWeightedScore * 100).toFixed(1)}%
            </span>
            {userWeightMultiplier > 0 && (
              <span
                className={`text-[10px] ${
                  scoreDiff > 0
                    ? "text-green-600"
                    : scoreDiff < 0
                      ? "text-red-600"
                      : "text-gray-400"
                }`}
              >
                {scoreDiff > 0 ? "+" : ""}
                {scoreDiff.toFixed(2)}%
              </span>
            )}
          </div>
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
        <TableCell className="text-right">
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            {entry.avgUploaderScore.toFixed(3)}
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
                  Weighted Score
                </TableHead>
                <TableHead className="text-right font-semibold text-gray-700 dark:text-gray-300">
                  Prompts Tested
                </TableHead>
                <TableHead className="text-right font-semibold text-gray-700 dark:text-gray-300">
                  Coverage
                </TableHead>
                <TableHead className="text-right font-semibold text-gray-700 dark:text-gray-300">
                  Avg Uploader Score
                </TableHead>
                {showResponseTime && (
                  <TableHead className="text-right font-semibold text-gray-700 dark:text-gray-300">
                    Avg. Response Time
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {topModels.map((entry, index) => renderTableRow(entry, index))}
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
    );
  };

  return (
    <div className="space-y-4">
      {/* User Scoring Algorithm Controls */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            User Scoring & Weighting Controls
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Algorithm Selection */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="user-scoring-algorithm"
                className="text-xs text-gray-600 dark:text-gray-400 font-medium"
              >
                User Scoring Algorithm:
              </label>
              <Select
                value={userScoringAlgorithm}
                onValueChange={(value: any) => setUserScoringAlgorithm(value)}
              >
                <SelectTrigger
                  id="user-scoring-algorithm"
                  className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simScores001">
                    simScores001 (Balanced)
                  </SelectItem>
                  <SelectItem value="simScores002">
                    simScores002 (Aggressive)
                  </SelectItem>
                </SelectContent>
              </Select>
              <span className="text-[10px] text-gray-500 dark:text-gray-500">
                {userScoringAlgorithm === "simScores001"
                  ? "Base: 0.5 + (feedbacks × 0.01) + (prompts × 0.005)"
                  : "Base: 0.3 + (feedbacks × 0.015) + (prompts × 0.003)"}
              </span>
            </div>

            {/* Weight Multiplier Slider */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="user-weight-multiplier"
                className="text-xs text-gray-600 dark:text-gray-400 font-medium"
              >
                User Weight Multiplier:
              </label>
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-500">0.0</span>
                <Slider
                  id="user-weight-multiplier"
                  min={0}
                  max={2}
                  step={0.1}
                  value={[userWeightMultiplier]}
                  onValueChange={(values) =>
                    setUserWeightMultiplier(values[0] ?? 0)
                  }
                  className="flex-1"
                />
                <span className="text-xs text-gray-500">2.0</span>
                <Input
                  type="number"
                  min={0}
                  max={2}
                  step={0.1}
                  value={userWeightMultiplier}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val >= 0 && val <= 2) {
                      setUserWeightMultiplier(val);
                    }
                  }}
                  className="w-20 text-right"
                />
              </div>
              <span className="text-[10px] text-gray-500 dark:text-gray-500">
                {userWeightMultiplier === 0
                  ? "Disabled - No user weighting applied"
                  : `Weight Factor = 1.0 + ${userWeightMultiplier.toFixed(2)} × (userScore - 0.5)`}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

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
              {/* Max Prompt Age */}
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="max-prompt-age"
                  className="text-xs text-gray-600 dark:text-gray-400"
                >
                  Max Prompt Age (days):
                </label>
                <Select
                  value={maxPromptAgeDays}
                  onValueChange={setMaxPromptAgeDays}
                >
                  <SelectTrigger
                    id="max-prompt-age"
                    className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                  >
                    <SelectValue placeholder="All ages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All ages</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="180">180 days</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-[10px] text-gray-500 dark:text-gray-500">
                  Filter out prompts older than this
                </span>
              </div>

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

            {/* Max Response Delay Filter */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <label className="text-xs text-gray-600 dark:text-gray-400 block mb-2">
                Max time between prompt registration and AI response:
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="any"
                  placeholder="e.g., 0.001 or 7"
                  value={maxResponseDelayValue}
                  onChange={(e) => setMaxResponseDelayValue(e.target.value)}
                  className="flex-1 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                />
                <Select
                  value={maxResponseDelayUnit}
                  onValueChange={(value) => setMaxResponseDelayUnit(value)}
                >
                  <SelectTrigger className="w-[140px] bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="microseconds">Microseconds</SelectItem>
                    <SelectItem value="seconds">Seconds</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <span className="text-[10px] text-gray-500 dark:text-gray-500 mt-1 block">
                Filter out responses published more than this time after prompt
                registration
              </span>
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
