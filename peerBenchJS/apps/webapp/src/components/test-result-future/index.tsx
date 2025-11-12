"use client";

import { ResponseTypeSingleItem as TestResultItem } from "@/app/api/v1/test-results/get";
import { CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import {
  LucideMessageCircle,
  LucideThumbsUp,
  LucideThumbsDown,
  LucideLoader2,
} from "lucide-react";
import { capitalize } from "@/utils/capitalize";
import { cn } from "@/utils/cn";
import { useState } from "react";
import { useReviewAPI } from "@/lib/hooks/use-review-api";
import { ReviewOpinion, ReviewOpinions } from "@/types/review";
import { toast } from "react-toastify";
import { errorMessage } from "@/utils/error-message";
import { ReviewModal, ReviewModalValue } from "../modals/review-modal";
import TestResultReviews from "../test-result-reviews";
import { ResponseCard } from "../response-card";

/**
 * The future implementation of the test result component.
 * Once it is completed replace TestResult component with this.
 */

export interface TestResultFutureProps {
  testResult: TestResultItem;
  enableReview?: boolean;
  showReview?: boolean;
  onTestResultReviewOpinionChange?: (
    opinion: ReviewOpinion,
    reviewId: number
  ) => void;
}

export default function TestResultFuture(props: TestResultFutureProps) {
  const {
    testResult,
    enableReview = true,
    showReview = true,
    onTestResultReviewOpinionChange,
  } = props;

  const [isUpdatingReview, setIsUpdatingReview] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewModalValue, setReviewModalValue] = useState<ReviewModalValue>({
    comment: testResult.userTestResultReview?.comment || "",
    opinion: testResult.userTestResultReview?.opinion || null,
  });
  const { saveReview, updateReview } = useReviewAPI();
  const reviewId = testResult.userTestResultReview?.id;

  const upsertReview = async (
    reviewData: {
      comment: string;
      opinion: ReviewOpinion;
    },
    target: "review" | "opinion"
  ) => {
    if (
      isUpdatingReview ||
      (target === "opinion" && // If user clicked the same opinion button again, don't do anything
        reviewData.opinion === testResult.userTestResultReview?.opinion)
    )
      return;

    // TODO: Ability to remove an existing review

    setIsUpdatingReview(true);
    try {
      const data = {
        testResultId: testResult.id,
        comment: reviewData.comment,
        opinion: reviewData.opinion,
        // TODO: Support property review maybe???
        // TODO: Support flags
      };

      let newReviewId: number;
      if (reviewId !== undefined) {
        await updateReview({
          ...data,
          reviewId,
        });
        newReviewId = reviewId;
        toast.success(`${capitalize(target)} updated successfully`);
      } else {
        const review = await saveReview(data);
        newReviewId = review.id;
        toast.success(`${capitalize(target)} saved successfully`);
      }
      onTestResultReviewOpinionChange?.(data.opinion, newReviewId);
    } catch (error) {
      console.error(error);
      toast.error(
        `Failed to change ${capitalize(target)}: ${errorMessage(error)}`
      );
    } finally {
      setIsUpdatingReview(false);
    }
  };

  const handleComment = () => {
    setIsReviewModalOpen(true);
  };

  const handleTestResultReviewOpinionChangeOpinion = async (
    opinion: ReviewOpinion
  ) => {
    await upsertReview(
      {
        comment: testResult.userTestResultReview?.comment || "",
        opinion,
      },
      "opinion"
    );
  };

  const handleReviewModalSubmit = async () => {
    if (!reviewModalValue.opinion) {
      toast.error("Please select an opinion");
      return;
    }
    await upsertReview(
      {
        comment: reviewModalValue.comment,
        opinion: reviewModalValue.opinion,
      },
      "review"
    );
    setIsReviewModalOpen(false);
  };

  const handleReviewModalCancel = () => {
    setIsReviewModalOpen(false);

    // Reset to original values
    setReviewModalValue({
      comment: testResult.userTestResultReview?.comment || "",
      opinion: testResult.userTestResultReview?.opinion || null,
    });
  };

  const handleReviewModalOpenChange = (open: boolean) => {
    setIsReviewModalOpen(open);
    // TODO: Should we reset the inputs of the review modal if user closes the modal without clicking cancel? In that case there is a high probability that the user has accidentally clicked outside of the modal.
    // if (!open) {
    //   handleReviewModalCancel();
    // }
  };

  return (
    <ResponseCard
      modelInfo={{
        modelId: testResult.modelId?.toString() ?? undefined,
        provider: testResult.provider,
      }}
      score={testResult.score ?? undefined}
      startedAt={testResult.startedAt}
      finishedAt={testResult.finishedAt}
      response={testResult.response ?? ""}
      metadata={testResult.metadata}
    >
      <ResponseCard.Footer>
        {enableReview && (
          <CardFooter className="flex justify-between items-center gap-4 pt-4 border-t">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleComment}
                disabled={isUpdatingReview}
                className="flex gap-2 items-center"
              >
                <LucideMessageCircle size={16} />
                Comment
              </Button>
            </div>

            <div className="flex-1" />

            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleTestResultReviewOpinionChangeOpinion(
                    ReviewOpinions.positive
                  )
                }
                disabled={isUpdatingReview}
                className={cn(
                  "flex gap-2 items-center hover:bg-green-50 hover:text-green-600",
                  {
                    "bg-green-50 text-green-600":
                      testResult.userTestResultReview?.opinion ===
                      ReviewOpinions.positive,
                  }
                )}
              >
                {isUpdatingReview ? (
                  <LucideLoader2 size={16} className="animate-spin" />
                ) : (
                  <LucideThumbsUp size={16} />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleTestResultReviewOpinionChangeOpinion(
                    ReviewOpinions.negative
                  )
                }
                disabled={isUpdatingReview}
                className={cn(
                  "flex gap-2 items-center hover:bg-red-50 hover:text-red-600",
                  {
                    "bg-red-50 text-red-600":
                      testResult.userTestResultReview?.opinion ===
                      ReviewOpinions.negative,
                  }
                )}
              >
                {isUpdatingReview ? (
                  <LucideLoader2 size={16} className="animate-spin" />
                ) : (
                  <LucideThumbsDown size={16} />
                )}
              </Button>
            </div>
          </CardFooter>
        )}

        {showReview && (
          <TestResultReviews
            testResultId={testResult.id}
            modelName={testResult.modelName || "Unknown Model"}
          />
        )}
        <ReviewModal
          open={isReviewModalOpen}
          review={reviewModalValue}
          isLoading={isUpdatingReview}
          onOpenChange={handleReviewModalOpenChange}
          onReviewChange={setReviewModalValue}
          onSubmit={handleReviewModalSubmit}
          onCancel={handleReviewModalCancel}
        />
      </ResponseCard.Footer>
    </ResponseCard>
  );
}
