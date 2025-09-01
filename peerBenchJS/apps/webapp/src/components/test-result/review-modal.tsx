"use client";

import { ThumbsUp, ThumbsDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ReviewOpinion } from "@/types/review";
import { useCallback, useEffect, useState } from "react";
import MultiSelect, { Option } from "@/components/ui/multi-select";
import { getReviews } from "@/lib/actions/get-reviews";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getFlags } from "@/lib/actions/get-flags";

const predefinedFlags = [
  { value: "wrongScore", label: "Wrong Score", opinion: "negative" },
  { value: "wrongAnswer", label: "Wrong Answer", opinion: "negative" },
  { value: "offTopic", label: "Off Topic", opinion: "negative" },
  { value: "irrelevant", label: "Irrelevant", opinion: "negative" },
  { value: "unclear", label: "Unclear", opinion: "negative" },
  { value: "incomplete", label: "Incomplete", opinion: "negative" },
  { value: "wrongResponse", label: "Wrong Response", opinion: "negative" },
  { value: "complete", label: "Complete", opinion: "positive" },
  { value: "fast", label: "Fast", opinion: "positive" },
  { value: "correct", label: "Correct", opinion: "positive" },
  { value: "correctAnswer", label: "Correct Answer", opinion: "positive" },
  { value: "slow", label: "Slow", opinion: "negative" },
  { value: "consistent", label: "Consistent", opinion: "positive" },
  { value: "inconsistent", label: "Inconsistent", opinion: "negative" },
  { value: "accurate", label: "Accurate", opinion: "positive" },
];

export type ExtendedOption = Option & {
  opinion?: ReviewOpinion;
};

export interface TestResultReviewModalProps {
  isOpen: boolean;
  title: string;
  description: string;

  reviewId?: number;
  testResultId?: number;
  promptId?: string;
  propertyKey?: string | null;

  onOpenChange: (open: boolean) => void;
  onSubmit: (params: {
    flags: ExtendedOption[];
    text: string;
    opinion: ReviewOpinion;

    reviewId?: number;
    testResultId?: number;
    promptId?: string;
    propertyKey?: string;
  }) => void;
  onCancel?: () => void;
}

export function TestResultReviewModal({
  isOpen,
  title,
  description,
  reviewId,
  testResultId,
  promptId,
  propertyKey,
  onOpenChange,
  onSubmit,
  onCancel,
}: TestResultReviewModalProps) {
  const [isExistingReviewLoading, setIsExistingReviewLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [selectedFlags, setSelectedFlags] = useState<ExtendedOption[]>([]);
  const [reviewOpinion, setReviewOpinion] = useState<ReviewOpinion | null>(
    null
  );

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        flags: selectedFlags,
        text: reviewText,
        opinion: reviewOpinion!,
        reviewId: reviewId,
        testResultId: testResultId,
        promptId: promptId,
        propertyKey: propertyKey || undefined,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpinionClick = useCallback(
    (opinion: ReviewOpinion) => {
      setReviewOpinion(reviewOpinion === opinion ? null : opinion);
    },
    [reviewOpinion]
  );

  const handleFlagsChange = useCallback(
    (flags: ExtendedOption[]) => {
      setSelectedFlags(
        flags.map<ExtendedOption>((flag) => {
          if (flag.opinion === undefined) {
            return {
              ...flag,
              opinion: reviewOpinion || undefined,
            };
          }
          return flag;
        })
      );
    },
    [reviewOpinion]
  );

  const handleReviewTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setReviewText(e.target.value);
    },
    []
  );

  const handleFlagSearch = useCallback(async (value: string) => {
    const flags = await getFlags({ search: value });
    return flags.map<ExtendedOption>((flag) => ({
      value: flag.value,
      label: flag.value
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (s: string) => s.toUpperCase()),
      opinion: flag.opinion || undefined,
    }));
  }, []);

  const clearForm = useCallback(() => {
    setReviewText("");
    setSelectedFlags([]);
    setReviewOpinion(null);
  }, []);

  const loadExistingReview = useCallback(async () => {
    setIsExistingReviewLoading(true);
    try {
      const [review] = await getReviews({
        reviewId: reviewId,
        promptId: promptId,
        property: propertyKey || undefined,
        testResultId: testResultId,
      });

      if (review) {
        setReviewText(review.comment);
        setSelectedFlags(
          review.flags.map((record) => ({
            value: record.flag,
            label: record.flag
              .replace(/([A-Z])/g, " $1")
              .replace(/^./, (s: string) => s.toUpperCase()),
          }))
        );
        setReviewOpinion(review.opinion);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsExistingReviewLoading(false);
    }
  }, [reviewId, testResultId, promptId, propertyKey]);

  const renderFlagOption = useCallback((flag: ExtendedOption) => {
    return (
      <div className="flex items-center justify-between w-full">
        {flag.label}{" "}
        <Badge
          className={cn(
            "px-2 py-1 rounded-full text-xs",
            flag.opinion === "positive"
              ? "bg-green-100/80 text-green-500/50"
              : "bg-red-100/80 text-red-500/50"
          )}
        >
          {flag.opinion === "positive" ? "Positive" : "Negative"}
        </Badge>
      </div>
    );
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (reviewId) {
        loadExistingReview();
      } else {
        clearForm();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, reviewId]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0 flex flex-col gap-4 py-4">
          {isExistingReviewLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                <span>Loading existing review...</span>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 px-2 flex-shrink-0">
              <div className="grid gap-2">
                <label className="text-xs text-gray-600 font-medium">
                  Flags (optional)
                </label>
                <MultiSelect
                  creatable
                  triggerSearchOnFocus
                  defaultOptions={predefinedFlags.filter(
                    (flag) => !reviewOpinion || flag.opinion === reviewOpinion
                  )}
                  loadingIndicator={
                    <div className="p-3 flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                      <span>Loading flags...</span>
                    </div>
                  }
                  onSearch={handleFlagSearch}
                  value={selectedFlags}
                  onChange={handleFlagsChange}
                  placeholder="Add flags..."
                  disabled={isSubmitting}
                  hidePlaceholderWhenSelected
                  renderOption={renderFlagOption}
                />
              </div>
              <div className="grid gap-2">
                <label
                  htmlFor="review"
                  className="text-xs text-gray-600 font-medium"
                >
                  Review (optional)
                </label>
                <Textarea
                  autoFocus
                  id="review"
                  placeholder="Your review..."
                  value={reviewText}
                  onChange={handleReviewTextChange}
                  className="min-h-[100px]"
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-xs text-gray-600 font-medium">
                  Opinion (required)
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={
                      reviewOpinion === "positive" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => handleOpinionClick("positive")}
                    disabled={isExistingReviewLoading}
                    className={`flex items-center gap-1.5 px-3 py-1.5 ${
                      reviewOpinion === "positive"
                        ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-200 dark:border-green-800 dark:hover:bg-green-900/40"
                        : "text-gray-600 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                    }`}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span className="font-medium">Positive</span>
                  </Button>
                  <Button
                    variant={
                      reviewOpinion === "negative" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => handleOpinionClick("negative")}
                    disabled={isExistingReviewLoading}
                    className={`flex items-center gap-1.5 px-3 py-1.5 ${
                      reviewOpinion === "negative"
                        ? "bg-red-100 text-red-800 border-red-200 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800 dark:hover:bg-red-900/40"
                        : "text-gray-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    }`}
                  >
                    <ThumbsDown className="w-4 h-4" />
                    <span className="font-medium">Negative</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="flex-shrink-0">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting || isExistingReviewLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reviewOpinion || isSubmitting || isExistingReviewLoading}
          >
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
