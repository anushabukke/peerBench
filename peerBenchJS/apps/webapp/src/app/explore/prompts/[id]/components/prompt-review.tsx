"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { TestResultReviewModal } from "@/components/test-result/review-modal";
import { saveReview } from "@/lib/actions/save-review";
import { toast } from "react-toastify";
import { ReviewOpinion } from "@/types/review";

interface PromptReviewProps {
  promptId: string;
}

export function PromptReview({ promptId }: PromptReviewProps) {
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const handleReviewModalOpenChange = useCallback((open: boolean) => {
    setIsReviewModalOpen(open);
  }, []);

  const handleReviewModalOnSubmitClick = useCallback(
    async (params: {
      flags: { value: string; opinion?: ReviewOpinion }[];
      text: string;
      opinion: ReviewOpinion;
      reviewId?: number;
      testResultId?: number;
      promptId?: string;
      propertyKey?: string;
    }) => {
      try {
        await saveReview({
          promptId: promptId,
          comment: params.text,
          flags: params.flags.map((option) => ({
            value: option.value,
            opinion: option.opinion || params.opinion,
          })),
          opinion: params.opinion,
        });

        setIsReviewModalOpen(false);
        toast.success("Review submitted successfully!");
      } catch (error) {
        console.error("Error submitting review:", error);
        toast.error("Failed to submit review. Please try again.");
      }
    },
    [promptId]
  );

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsReviewModalOpen(true)}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
      >
        <MessageSquare className="w-4 h-4" />
        Submit a Review
      </Button>

      <TestResultReviewModal
        title="Submit a Review"
        description="Please give your detailed feedback about the content"
        isOpen={isReviewModalOpen}
        promptId={promptId}
        onOpenChange={handleReviewModalOpenChange}
        onSubmit={handleReviewModalOnSubmitClick}
      />
    </>
  );
}
