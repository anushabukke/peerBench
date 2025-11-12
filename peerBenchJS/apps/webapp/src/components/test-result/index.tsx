"use client";

import { cn } from "@/utils/cn";
import { ChevronDown } from "lucide-react";
import { DateTime } from "luxon";
import { formatMs, tryParseJson } from "@peerbench/sdk";
import { useCallback, useMemo, useState, useEffect } from "react";
import { ReviewButtons } from "./review-buttons";
import { ReviewModal } from "../modals/review-modal";
import { TestResultProperty } from "./property";
import { JSONView } from "../json-view";
import { saveReview } from "@/lib/actions/save-review";
import { toast } from "react-toastify";
import { updateReview } from "@/lib/actions/update-review";
import type { GetTestResultsReturnItem } from "@/services/test-result.service";
import { type User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { EvaluationSources } from "@/database/types";
import { ReviewModalValue } from "../modals/review-modal";

function TestResult({
  evaluationIndex,
  testIndex,
  promptSetId,
  user,
  ...props
}: {
  evaluationIndex: number;
  testIndex: number;
  promptSetId?: number | null;
  test: GetTestResultsReturnItem;
  user: User | null;
}) {
  const router = useRouter();
  const [reviewTarget, setReviewTarget] = useState<"testResult" | "prompt">(
    "testResult"
  );
  const [reviewPropertyKey, setReviewPropertyKey] = useState<string | null>(
    null
  );
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [test, setTest] = useState(props.test);
  const [reviewToBeLoaded, setReviewToBeLoaded] = useState<
    (ReviewModalValue & { id?: number }) | null
  >(null);

  // When a review is made, we want to keep that review id
  // on the frontend so we don't need to refetch the same data
  // just because for getting review id.
  useEffect(() => setTest(test), [test]);

  // Helper function to get review data for a property or the whole test result if available any
  const getTestResultReviewData = useCallback(
    (params?: { propertyKey?: string; promptReview?: boolean }) => {
      if (params?.promptReview) {
        if (test.userPromptReview?.id === undefined) {
          return null;
        }

        return {
          id: test.userPromptReview.id,
          comment: test.userPromptReview.comment || "",
          opinion: test.userPromptReview.opinion,
          property: null,
        };
      }

      // For whole test result review, look for review with null property
      if (!params?.propertyKey) {
        if (!test.userTestResultReview) return null;
        return {
          id: test.userTestResultReview.id,
          comment: test.userTestResultReview.comment || "",
          opinion: test.userTestResultReview.opinion,
          property: null,
        };
      }

      // For property-specific reviews, look for review with matching property
      const propertyReview = test.userPropertyReviews?.find(
        (review) => review.property === params?.propertyKey
      );

      if (!propertyReview) return null;

      return {
        id: propertyReview.id,
        comment: propertyReview.comment || "",
        opinion: propertyReview.opinion,
        property: propertyReview.property,
      };
    },
    [test.userPropertyReviews, test.userPromptReview, test.userTestResultReview]
  );

  const results = useMemo(() => {
    let arr =
      test.result && typeof test.result === "object"
        ? Object.entries(test.result)
        : ([["Result", String(test.result)]] as [string, any][]);

    // Only peerBench sourced test results have startedAt
    // and finishedAt values in themselves. In that case
    // include the duration as a property in the UI
    if (
      test.result?.startedAt &&
      test.result?.finishedAt &&
      test.result?.source === EvaluationSources.PeerBench
    ) {
      arr.push([
        "Duration",
        formatMs(
          DateTime.fromISO(test.result.finishedAt)
            .diff(DateTime.fromISO(test.result.startedAt))
            .toMillis(),
          {
            full: true,
            include: ["second", "minute", "hour", "day"],
          }
        ),
      ]);
    }

    // Merge prompt and correct answer into a single property
    // so we can nicely format them on the UI
    arr = arr.reduce(
      (acc, [key, value]) => {
        // Skip the correct answer so it won't be displayed as a independent property
        if (key.toLowerCase() === "correctanswer") {
          return acc;
        }

        // If there is a prompt property, then merge
        // it with the correct answer
        if (key.toLowerCase() === "prompt") {
          const correctAnswer = arr.find(
            ([k]) => k.toLowerCase() === "correctanswer"
          );

          if (correctAnswer) {
            acc.push([
              "prompt & answer",
              {
                prompt: value,
                answer: correctAnswer[1],
              },
            ]);
            return acc;
          }
        }

        // If the conditions above are not met, simply include the property and its value as it is
        acc.push([key, value]);
        return acc;
      },
      [] as [string, any][]
    );

    // Sort the properties for better readability
    arr.sort(([ka, a], [kb, b]) => {
      const strA = JSON.stringify(a);
      const strB = JSON.stringify(b);

      // Define the priority order for specific properties
      const priorityOrder = ["score", "prompt & answer", "response"];
      const kaLower = ka.toLowerCase();
      const kbLower = kb.toLowerCase();

      const kaIndex = priorityOrder.findIndex((prop) => kaLower.includes(prop));
      const kbIndex = priorityOrder.findIndex((prop) => kbLower.includes(prop));

      // If both keys are in the priority order, sort by their position
      if (kaIndex !== -1 && kbIndex !== -1) {
        return kaIndex - kbIndex;
      }

      // If only one key is in the priority order, prioritize it
      if (kaIndex !== -1) {
        return -1;
      }
      if (kbIndex !== -1) {
        return 1;
      }

      // Group the keys that start with "model" together
      if (kaLower.startsWith("model") || kbLower.startsWith("model")) {
        return kaLower.startsWith("model") ? -1 : 1;
      }

      // Move metadata property to the bottom
      if (kaLower === "metadata") {
        return 1;
      }
      if (kbLower === "metadata") {
        return -1;
      }

      // Sort the rest by length
      return strA.length - strB.length;
    });

    return arr;
  }, [test]);

  // If raw data is a JSON string then try to parse it so we can
  // render it with the JSONView component
  const rawData = useMemo(
    () => tryParseJson(test.raw || "{") || test.raw,
    [test]
  );

  const handleTestResultReviewClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();

      if (!user) {
        router.push("/login");
        return;
      }

      setReviewTarget("testResult");
      setReviewToBeLoaded(getTestResultReviewData());
      setIsReviewModalOpen(true);
    },
    [getTestResultReviewData, user, router]
  );

  const handlePropertyReviewClick = useCallback(
    (value: any, propertyKey: string) => {
      if (!user) {
        router.push("/login");
        return;
      }

      const target =
        propertyKey.toLowerCase() === "prompt & answer"
          ? "prompt"
          : "testResult";
      setReviewPropertyKey(propertyKey);
      setReviewToBeLoaded(
        getTestResultReviewData({
          propertyKey,
          promptReview: target === "prompt",
        })
      );
      setReviewTarget(target);
      setIsReviewModalOpen(true);
    },
    [getTestResultReviewData, user, router]
  );

  const handleReviewModalOpenChange = useCallback((isOpen: boolean) => {
    setIsReviewModalOpen(isOpen);
  }, []);

  const handleReviewModalOnCancelClick = useCallback(() => {
    setIsReviewModalOpen(false);
  }, []);

  const handleReviewChange = useCallback((review: ReviewModalValue) => {
    setReviewToBeLoaded(review);
  }, []);

  const handleReviewModalOnSubmitClick = useCallback(async () => {
    if (!reviewToBeLoaded) return;

    // Update the review
    if (reviewToBeLoaded.id !== undefined) {
      await updateReview({
        reviewId: reviewToBeLoaded.id,
        comment: reviewToBeLoaded.comment,
        flags: [], // No flags in the new modal
        opinion: reviewToBeLoaded.opinion!,
        property:
          reviewTarget === "testResult"
            ? reviewPropertyKey || undefined
            : undefined,
        promptId: reviewTarget === "prompt" ? test.result.promptId : undefined,
        testResultId: reviewTarget === "testResult" ? test.id : undefined,
      });
    } else {
      // Insert a new review
      const review = await saveReview({
        comment: reviewToBeLoaded.comment,
        flags: [], // No flags in the new modal
        opinion: reviewToBeLoaded.opinion!,
        promptId: reviewTarget === "prompt" ? test.result.promptId : undefined,
        property:
          reviewTarget === "testResult"
            ? reviewPropertyKey || undefined
            : undefined,
        testResultId: reviewTarget === "testResult" ? test.id : undefined,
      });

      // Since this is a new review, update the test object's review id
      setTest((prev) => ({
        ...prev,
        userPromptReview:
          reviewTarget === "prompt"
            ? {
                id: review.id,
                comment: review.comment || "",
                opinion: review.opinion!,
                createdAt: new Date(),
                flags: [],
              }
            : prev.userPromptReview,
        userTestResultReview:
          reviewTarget === "testResult" && !reviewPropertyKey
            ? {
                id: review.id,
                comment: review.comment || "",
                opinion: review.opinion!,
                createdAt: new Date(),
                flags: [],
              }
            : prev.userTestResultReview,
        userPropertyReviews:
          reviewTarget === "testResult" && reviewPropertyKey
            ? [
                ...(prev.userPropertyReviews || []),
                {
                  id: review.id,
                  comment: review.comment || "",
                  opinion: review.opinion!,
                  property: reviewPropertyKey,
                  createdAt: new Date(),
                  flags: [],
                },
              ]
            : prev.userPropertyReviews,
      }));
    }

    setIsReviewModalOpen(false);
    toast.success("Review saved successfully");
  }, [
    reviewToBeLoaded,
    reviewTarget,
    reviewPropertyKey,
    test.id,
    test.result.promptId,
  ]);

  return (
    <div
      id={`evaluation-${evaluationIndex + 1}-test-${testIndex + 1}`}
      className={cn(
        `border-2 rounded-xl`,
        test.isSuccess
          ? "border-green-200 bg-white dark:bg-gray-800"
          : "border-red-200 bg-white dark:bg-gray-800"
      )}
    >
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "rounded-tl-xl rounded-tr-xl p-4 flex items-center justify-between hover:cursor-pointer transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-700/50",
          isExpanded ? "mb-4" : "rounded-bl-xl rounded-br-xl"
        )}
      >
        <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200">
          {test.testName}
        </h4>
        <div className="flex items-center gap-2">
          <span
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              test.isSuccess
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
            }`}
          >
            {test.isSuccess
              ? `Success ${
                  test.result?.score !== undefined &&
                  test.result.score !== 1 &&
                  test.result.score !== 0
                    ? `- Score ${test.result?.score}`
                    : ""
                }`
              : "Failed"}
          </span>
          <ChevronDown
            className={`w-6 h-6 text-gray-500 dark:text-gray-400 transition-transform ${
              isExpanded ? "transform rotate-180" : ""
            }`}
          />
        </div>
      </div>
      <div
        className={cn(
          "space-y-6 px-4",
          isExpanded ? "max-h-full  pb-4" : "max-h-0 overflow-hidden"
        )}
      >
        {
          <div className="mt-4">
            <h5 className="flex items-center w-full justify-between text-lg font-medium mb-2 text-gray-700 dark:text-gray-300">
              Details:
              <div className="flex items-center gap-2">
                <ReviewButtons
                  onClick={handleTestResultReviewClick}
                  type="textAndIcon"
                />
              </div>
            </h5>
            <div className="bg-gray-50 border dark:bg-gray-700 p-4 rounded-lg overflow-x-auto text-sm">
              <div className="divide-y divide-gray-200 dark:divide-gray-600">
                {results.map((result) => (
                  <TestResultProperty
                    key={result[0]}
                    result={result}
                    promptSetId={promptSetId}
                    onPropertyReview={handlePropertyReviewClick}
                  />
                ))}
              </div>
            </div>
          </div>
        }
        {test.raw && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                Raw Data
              </h5>
            </div>
            <div className="text-sm font-mono whitespace-pre-wrap break-words mb-4 bg-gray-50 border dark:bg-gray-700 p-4 rounded-lg">
              {typeof rawData === "string" ? (
                rawData
              ) : (
                <JSONView data={rawData} />
              )}
            </div>
          </div>
        )}
      </div>

      <ReviewModal
        open={isReviewModalOpen}
        review={reviewToBeLoaded || undefined}
        onOpenChange={handleReviewModalOpenChange}
        onReviewChange={handleReviewChange}
        onCancel={handleReviewModalOnCancelClick}
        onSubmit={handleReviewModalOnSubmitClick}
      />
    </div>
  );
}

export default TestResult;
