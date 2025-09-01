"use client";

import { ChevronDown } from "lucide-react";
import { DateTime } from "luxon";
import { useEffect, useMemo, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { EvaluationData } from "@/services/evaluation.service";
import { getTestResults } from "@/lib/actions/get-test-results";
import { Pagination } from "@/components/pagination";
import TestResult from "@/components/test-result";
import TestResultSkeleton from "@/components/test-result/skeleton";
import TestResultFilters, {
  TestResultFilterValues,
} from "./test-result-filters";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { formatMs } from "@peerbench/sdk";
import { GetTestResultsResult } from "@/services/test-result.service";
import { type User } from "@supabase/supabase-js";

const DEFAULT_PAGE_SIZE = 5;
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

function decodeSearchParam(value: string | null) {
  if (value === null) {
    return null;
  }
  return decodeURI(value);
}

export default function EvaluationItem({
  evaluation,
  evaluationIndex,
  user,
}: {
  evaluation: EvaluationData;
  evaluationIndex: number;
  user: User | null;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const isFilterParamsPresent = useMemo(() => {
    return searchParams
      .entries()
      .some(([key]) => key.startsWith(`evaluation-${evaluationIndex + 1}-`));
  }, [searchParams, evaluationIndex]);
  const [isTestResultsLoading, startLoadingTestResults] = useTransition();
  const [isExpanded, setIsExpanded] = useState(isFilterParamsPresent);
  const [testResults, setTestResults] = useState<GetTestResultsResult[]>([]);
  const [totalTestResultCount, setTotalTestResultCount] = useState(0);

  // Get current values from URL parameters
  const testResultsPage = Number(
    searchParams.get(`evaluation-${evaluationIndex + 1}-page`) || "1"
  );

  const testResultsPageSize = Number(
    searchParams.get(`evaluation-${evaluationIndex + 1}-pageSize`) ||
      DEFAULT_PAGE_SIZE.toString()
  );

  const testResultFilters: TestResultFilterValues = {
    testName: decodeSearchParam(
      searchParams.get(`evaluation-${evaluationIndex + 1}-testName`)
    ),
    provider: decodeSearchParam(
      searchParams.get(`evaluation-${evaluationIndex + 1}-provider`)
    ),
    modelName: decodeSearchParam(
      searchParams.get(`evaluation-${evaluationIndex + 1}-modelName`)
    ),
    promptType: decodeSearchParam(
      searchParams.get(`evaluation-${evaluationIndex + 1}-promptType`)
    ),
    promptSetTitle: decodeSearchParam(
      searchParams.get(`evaluation-${evaluationIndex + 1}-promptSetTitle`)
    ),
    minScore: Number(
      decodeSearchParam(
        searchParams.get(`evaluation-${evaluationIndex + 1}-minScore`)
      ) || "0"
    ),
    maxScore: Number(
      decodeSearchParam(
        searchParams.get(`evaluation-${evaluationIndex + 1}-maxScore`)
      ) || "1"
    ),
    isSuccess:
      decodeSearchParam(
        searchParams.get(`evaluation-${evaluationIndex + 1}-isSuccess`)
      ) === "true"
        ? true
        : decodeSearchParam(
              searchParams.get(`evaluation-${evaluationIndex + 1}-isSuccess`)
            ) === "false"
          ? false
          : null,
    scoreStrategy: decodeSearchParam(
      searchParams.get(`evaluation-${evaluationIndex + 1}-scoreStrategy`)
    ),
    replaceEntityStrategy: decodeSearchParam(
      searchParams.get(
        `evaluation-${evaluationIndex + 1}-replaceEntityStrategy`
      )
    ),
    paragraphMergeStrategy: decodeSearchParam(
      searchParams.get(
        `evaluation-${evaluationIndex + 1}-paragraphMergeStrategy`
      )
    ),
    pickTextStrategy: decodeSearchParam(
      searchParams.get(`evaluation-${evaluationIndex + 1}-pickTextStrategy`)
    ),
    typoDifficulty: decodeSearchParam(
      searchParams.get(`evaluation-${evaluationIndex + 1}-typoDifficulty`)
    ),
  };

  const loadTestResults = async () => {
    startLoadingTestResults(async () => {
      const results = await getTestResults({
        filters: {
          evaluationId: evaluation.id,
          ...testResultFilters,
        },
        page: testResultsPage,
        pageSize: testResultsPageSize,
      });

      setTestResults(results.data);
      setTotalTestResultCount(results.pagination.totalRecords);
    });
  };

  useEffect(() => {
    if (isExpanded) {
      loadTestResults().then(() => {
        if (isFilterParamsPresent) {
          const el = document.getElementById(
            `evaluation-${evaluationIndex + 1}-test-results`
          );
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "end" });
          }
        }
      });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const updateURLParams = (
    updates: Record<string, string | number | boolean | null>
  ) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });

    startLoadingTestResults(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  const handleFiltersChange = (filters: TestResultFilterValues) => {
    // Map filter values to URL parameters
    const updates: Record<string, string | number | boolean | null> = {
      [`evaluation-${evaluationIndex + 1}-testName`]: filters.testName,
      [`evaluation-${evaluationIndex + 1}-provider`]: filters.provider,
      [`evaluation-${evaluationIndex + 1}-modelName`]: filters.modelName,
      [`evaluation-${evaluationIndex + 1}-promptType`]: filters.promptType,
      [`evaluation-${evaluationIndex + 1}-promptSetTitle`]:
        filters.promptSetTitle,
      [`evaluation-${evaluationIndex + 1}-isSuccess`]: filters.isSuccess,
      [`evaluation-${evaluationIndex + 1}-minScore`]:
        filters.minScore === 0 ? null : filters.minScore,
      [`evaluation-${evaluationIndex + 1}-maxScore`]:
        filters.maxScore === 1 ? null : filters.maxScore,
      [`evaluation-${evaluationIndex + 1}-scoreStrategy`]:
        filters.scoreStrategy,
      [`evaluation-${evaluationIndex + 1}-replaceEntityStrategy`]:
        filters.replaceEntityStrategy,
      [`evaluation-${evaluationIndex + 1}-paragraphMergeStrategy`]:
        filters.paragraphMergeStrategy,
      [`evaluation-${evaluationIndex + 1}-pickTextStrategy`]:
        filters.pickTextStrategy,
      [`evaluation-${evaluationIndex + 1}-typoDifficulty`]:
        filters.typoDifficulty,
    };

    // Reset page to 1 when filters change
    updates[`evaluation-${evaluationIndex + 1}-page`] = null;

    updateURLParams(updates);
  };

  const handlePageSizeChange = (pageSize: number) => {
    setTestResults([]);
    updateURLParams({
      [`evaluation-${evaluationIndex + 1}-pageSize`]:
        pageSize === DEFAULT_PAGE_SIZE ? null : pageSize,
      [`evaluation-${evaluationIndex + 1}-page`]: null, // It is default to 1 so we can remove the URL param
    });
  };

  const handlePageChange = (page: number) => {
    setTestResults([]);
    updateURLParams({
      [`evaluation-${evaluationIndex + 1}-page`]: page === 1 ? null : page,
    });
  };

  const skeletonCount = useMemo(() => {
    if (totalTestResultCount === 0) {
      return testResultsPageSize;
    }

    const count = Math.min(
      testResultsPageSize,
      totalTestResultCount || testResultsPageSize,
      (totalTestResultCount || testResultsPageSize) -
        testResultsPage * testResultsPageSize
    );

    if (count <= 0) {
      return totalTestResultCount;
    }

    return count;
  }, [totalTestResultCount, testResultsPage, testResultsPageSize]);

  const formattedProperties = useMemo(() => {
    const duration = DateTime.fromJSDate(evaluation.finishedAt).diff(
      DateTime.fromJSDate(evaluation.startedAt)
    );
    return {
      promptSet: `${evaluation.promptSetName} (id: ${evaluation.promptSetId})`,
      startedAt: DateTime.fromJSDate(evaluation.startedAt).toFormat("DD TTT"),
      finishedAt: DateTime.fromJSDate(evaluation.finishedAt).toFormat("DD TTT"),
      duration: formatMs(duration.toMillis(), {
        full: true,
        include: ["second", "minute", "hour", "day"],
      }),
    };
  }, [evaluation]);

  return (
    <div
      key={evaluation.id}
      id={evaluationIndex.toString()}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
    >
      <button
        onClick={() => {
          setIsExpanded((prev) => {
            const newValue = !prev;

            if (newValue && testResults.length === 0) {
              loadTestResults();
            }
            return newValue;
          });
        }}
        className="w-full p-6 flex items-center justify-between hover:cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
      >
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
          Evaluation #{evaluationIndex + 1}
        </h2>
        <ChevronDown
          className={`w-6 h-6 text-gray-500 dark:text-gray-400 transition-transform ${
            isExpanded ? "transform rotate-180" : ""
          }`}
        />
      </button>

      <div className={cn(`space-y-6`, isExpanded ? "max-h-full" : "max-h-0")}>
        <div
          id={`evaluation-${evaluationIndex + 1}-info`}
          className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6"
        >
          <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
            Metadata
          </h3>
          <div className="space-y-4">
            <EvaluationProperty
              label="Prompt Set"
              property={evaluation.promptSetId}
              formattedProperty={formattedProperties.promptSet}
            />
            <EvaluationProperty
              label="Score"
              property={evaluation.score}
              formattedProperty={evaluation.score.toString()}
            />
            <EvaluationProperty
              label="Started At"
              property={evaluation.startedAt}
              formattedProperty={formattedProperties.startedAt}
            />
            <EvaluationProperty
              label="Finished At"
              property={evaluation.finishedAt}
              formattedProperty={formattedProperties.finishedAt}
            />
            <EvaluationProperty
              label="Duration"
              property={evaluation.finishedAt}
              formattedProperty={formattedProperties.duration}
            />
            <EvaluationProperty
              label="Uploader ID"
              property={evaluation.uploaderId}
              formattedProperty={evaluation.uploaderId?.toString()}
            />
            <EvaluationProperty
              label="Agreement ID"
              property={evaluation.agreementId}
              formattedProperty={evaluation.agreementId?.toString()}
            />
            <EvaluationProperty
              label="Offer ID"
              property={evaluation.offerId}
              formattedProperty={evaluation.offerId?.toString()}
            />
            <EvaluationProperty
              label="Provider ID"
              property={evaluation.providerId}
              formattedProperty={evaluation.providerId?.toString()}
            />
          </div>
        </div>

        <div
          id={`evaluation-${evaluationIndex + 1}-test-results`}
          className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6"
        >
          <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
            Test Results (total {evaluation.totalTestCount})
          </h3>

          <TestResultFilters
            evaluationId={evaluation.id}
            initialFilters={testResultFilters}
            onFiltersChange={handleFiltersChange}
          />

          <div className="space-y-6 mt-6">
            {isTestResultsLoading ? (
              // Show skeleton placeholders while loading
              <TestResultSkeletons count={skeletonCount} />
            ) : testResults.length === 0 ? (
              <div className="w-full flex justify-center items-center mt-4">
                <p className="text-gray-500 dark:text-gray-400">
                  No results found
                </p>
              </div>
            ) : (
              testResults.map((test, testIndex) => (
                <TestResult
                  key={`${evaluationIndex}-${testIndex}`}
                  evaluationIndex={evaluationIndex}
                  testIndex={testIndex}
                  test={test}
                  promptSetId={evaluation.promptSetId}
                  user={user}
                />
              ))
            )}
          </div>

          <div className="mt-6">
            <Pagination
              currentPage={testResultsPage}
              pageSize={testResultsPageSize}
              totalItemCount={totalTestResultCount}
              disabled={isTestResultsLoading || testResults.length === 0}
              sizeOptions={PAGE_SIZE_OPTIONS}
              onPageSizeChange={handlePageSizeChange}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TestResultSkeletons({ count }: { count: number }) {
  return Array.from({
    length: count,
  }).map((_, skeletonIndex) => (
    <TestResultSkeleton key={`skeleton-${skeletonIndex}`} />
  ));
}

function EvaluationProperty<T>({
  property,
  formattedProperty,
  label,
}: {
  label: string;
  property: T;
  formattedProperty?: string | null;
}) {
  if (property === null || property === undefined) {
    return;
  }

  return (
    <div className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded-lg">
      <span className="font-medium text-gray-600 dark:text-gray-300">
        {label}
      </span>
      <span className="text-gray-800 dark:text-gray-200">
        {formattedProperty}
      </span>
    </div>
  );
}
