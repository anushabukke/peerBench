"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { Loader2, CheckCircle, Info } from "lucide-react";
import { errorMessage } from "@/utils/error-message";
import { usePromptAPI } from "@/lib/hooks/use-prompt-api";
import { useRouter } from "next/navigation";
import { QuickFeedbackOpinion } from "@/database/types";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import Link from "next/link";

export interface FeedbackProps {
  promptId: string;
}

export default function Feedback({ promptId }: FeedbackProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { upsertQuickFeedback } = usePromptAPI();
  const router = useRouter();

  const handleOpinionClick = async (opinion: QuickFeedbackOpinion) => {
    setIsSubmitting(true);

    try {
      // Submit feedback immediately
      await upsertQuickFeedback(promptId, {
        opinion,
      });

      setIsSubmitted(true);
      toast.success(
        <div>
          Feedback submitted successfully!{" "}
          <Link href="/myActivity" className="underline font-semibold">
            View your activity
          </Link>
        </div>
      );

      // Move to next prompt after a brief delay
      setTimeout(() => {
        handleNextPromptClick();
      }, 500);
    } catch (err) {
      console.error(err);
      toast.error(`Failed: ${errorMessage(err)}`);
      setIsSubmitting(false);
    }
  };

  const handleSkipClick = () => {
    handleNextPromptClick();
  };

  const handleNextPromptClick = () => {
    setIsSubmitted(false);
    setIsSubmitting(false);

    router.refresh();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {isSubmitted && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <span className="text-green-700 text-sm font-medium">
            Feedback submitted, loading next prompt...
          </span>
        </div>
      )}

      <div className="space-y-4">
        {/* Opinion Selection */}
        <div className="space-y-3">
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => handleOpinionClick("positive")}
              className="flex-1 p-3 h-auto border-green-300 text-green-700 hover:bg-green-50 hover:border-green-300"
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">👍</span>
                <span className="font-medium">Good Prompt</span>
                <Tooltip>
                  <TooltipTrigger
                    asChild
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  >
                    <div>
                      <Info className="w-4 h-4 opacity-60 cursor-help" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    If the prompt is clear and logically coherent while the expected answer correct
                  </TooltipContent>
                </Tooltip>
              </div>
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting || isSubmitted}
              onClick={handleSkipClick}
              className="flex-1 p-3 h-auto bg-white border-gray-400 hover:border-gray-500"
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">⏭</span>
                <span className="font-medium">Skip</span>
              </div>
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => handleOpinionClick("negative")}
              className="flex-1 p-3 h-auto border-red-300 text-red-700 hover:bg-red-50 hover:border-red-300"
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">👎</span>
                <span className="font-medium">Bad Prompt</span>
                <Tooltip>
                  <TooltipTrigger
                    asChild
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  >
                    <div>
                      <Info className="w-4 h-4 opacity-60 cursor-help" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    If either the expected answer is wrong or the prompt itself is lacking crucial information, illogical or doesn&apos;t contain clear instructions / coherent question.
                  </TooltipContent>
                </Tooltip>
              </div>
            </Button>
          </div>
        </div>

        {isSubmitting && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-2 text-sm text-gray-600">Submitting feedback...</span>
          </div>
        )}
      </div>
    </>
  );
}
