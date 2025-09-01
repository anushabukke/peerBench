"use client";

import { useCallback, useMemo } from "react";
import { DateTime } from "luxon";
import { ReviewButtons } from "./review-buttons";
import { JSONView } from "../json-view";

const reviewableProperties = ["prompt & answer", "score", "response"];

export type TestResultDetailsProps = {
  result: [string, any];
  promptSetId?: number | null;
  onPropertyReview: (value: any, propertyKey: string) => void;
};

export function TestResultProperty({
  result,
  onPropertyReview,
  promptSetId,
}: TestResultDetailsProps) {
  const [property, value] = useMemo(() => result, [result]);
  const title = useMemo(() => {
    return property
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (s) => s.toUpperCase());
  }, [property]);
  const isLong = useMemo(() => {
    return typeof value === "string"
      ? value.length > 100 || value.includes("\n")
      : false;
  }, [value]);
  const isReviewable = useMemo(
    () => reviewableProperties.includes(property),
    [property]
  );

  const handlePropertyReview = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onPropertyReview(value, property);
    },
    [onPropertyReview, value, property]
  );

  if (value === null || value === undefined) {
    return null;
  }

  return (
    <div
      key={property}
      className="py-2 flex flex-col sm:flex-row gap-1 sm:gap-4"
    >
      <span className="w-48 capitalize text-gray-700 dark:text-gray-300 shrink-0">
        {title}
      </span>
      <div className="flex-1 flex items-start justify-between gap-2">
        <div className="flex-1">
          {isLong ? (
            <pre className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded p-2 w-full overflow-x-auto text-xs whitespace-pre-wrap">
              <Value property={property} value={value} />
            </pre>
          ) : (
            <span className="text-gray-900 dark:text-gray-100 break-all">
              <Value property={property} value={value} />
            </span>
          )}
        </div>
        {promptSetId !== null && promptSetId !== undefined && isReviewable && (
          <ReviewButtons onClick={handlePropertyReview} />
        )}
      </div>
    </div>
  );
}

function Value({ property, value }: { property: string; value: any }) {
  if (
    typeof value === "string" &&
    (property === "startedAt" || property === "finishedAt")
  ) {
    return DateTime.fromISO(String(value)).toFormat("TTT, DD");
  }

  if (typeof value === "object") {
    if (property === "prompt & answer") {
      return (
        <div className="space-y-3">
          <div>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Prompt:
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <pre className="text-gray-900 dark:text-gray-100 break-words text-xs leading-relaxed whitespace-pre-wrap">
                {value.prompt}
              </pre>
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Correct Answer:
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <span className="text-gray-900 dark:text-gray-100 break-words text-sm leading-relaxed">
                {typeof value.answer === "string" ? (
                  value.answer
                ) : (
                  <JSONView data={value.answer} />
                )}
              </span>
            </div>
          </div>
        </div>
      );
    }

    return <JSONView data={value} />;
  }

  return String(value);
}
