import { Prompt, PromptTypes } from "peerbench";
import { Loader2, LucideHash } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import MultipleChoice from "./multiple-choice";
import OpenEnded from "./open-ended";
import OrderSentences from "./order-sentences";
import TextReplacement from "./text-replacement";
import Typo from "./typo";
import Unknown from "./unknown";

export type PromptsPreviewProps = {
  prompts: Prompt[];
  allPrompts?: Prompt[];
  totalPrompts?: number;
  showCorrectAnswer?: boolean;
  isLoading?: boolean;
};

export default function PromptsPreview({
  prompts: samplePrompts,
  allPrompts,
  totalPrompts,
  showCorrectAnswer = true,
  isLoading = false,
}: PromptsPreviewProps) {
  const [showAll, setShowAll] = useState(false);
  const displayPrompts = showAll && allPrompts ? allPrompts : samplePrompts;
  const hasMoreThanSample =
    allPrompts && allPrompts.length > samplePrompts.length;
  return (
    <div
      className={`border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
    >
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="preview" className="border-none">
          <AccordionTrigger className="w-full flex justify-between items-center text-left group hover:cursor-pointer">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Prompts Preview
            </h3>
            <div className="flex items-center space-x-2">
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-600 dark:text-gray-400" />
                  <span className="ml-2 text-gray-600 dark:text-gray-400">
                    Loading...
                  </span>
                </div>
              ) : (
                displayPrompts.length > 0 && (
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {totalPrompts !== undefined
                      ? `${displayPrompts.length} of ${totalPrompts} prompts`
                      : `${displayPrompts.length} prompts`}
                    {totalPrompts &&
                      totalPrompts > displayPrompts.length &&
                      !showAll && (
                        <span className="text-xs text-gray-500 dark:text-gray-500 ml-1">
                          (showing samples)
                        </span>
                      )}
                  </span>
                )
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="overflow-hidden">
            <div className="mt-4 space-y-4 max-h-96 overflow-y-auto">
              {!isLoading &&
                displayPrompts.map((prompt, index) => (
                  <div key={index} className="flex flex-col gap-2">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <LucideHash size={12} />
                      {prompt.promptUUID}
                    </div>
                    <div className="border rounded p-3 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                      <PromptRenderer
                        prompt={prompt}
                        showCorrectAnswer={showCorrectAnswer}
                      />
                    </div>
                  </div>
                ))}
            </div>
            {hasMoreThanSample && (
              <div className="mt-4 flex justify-center">
                <Button
                  type="button"
                  onClick={() => setShowAll(!showAll)}
                  variant="outline"
                  size="sm"
                >
                  {showAll ? "Show Sample (5)" : "Show All Prompts"}
                </Button>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

// Component to render different prompt types
function PromptRenderer({
  prompt,
  showCorrectAnswer,
}: {
  prompt: Prompt;
  showCorrectAnswer: boolean;
}) {
  // Render based on prompt type
  switch (prompt.type) {
    case PromptTypes.MultipleChoice:
      return (
        <MultipleChoice prompt={prompt} showCorrectAnswer={showCorrectAnswer} />
      );
    case PromptTypes.OpenEnded:
      return (
        <OpenEnded prompt={prompt} showCorrectAnswer={showCorrectAnswer} />
      );
    case PromptTypes.OrderSentences:
      return (
        <OrderSentences prompt={prompt} showCorrectAnswer={showCorrectAnswer} />
      );
    case PromptTypes.TextReplacement:
      return (
        <TextReplacement
          prompt={prompt}
          showCorrectAnswer={showCorrectAnswer}
        />
      );
    case PromptTypes.Typo:
      return <Typo prompt={prompt} showCorrectAnswer={showCorrectAnswer} />;
    default:
      // Fallback for unknown types
      return <Unknown prompt={prompt} showCorrectAnswer={showCorrectAnswer} />;
  }
}
