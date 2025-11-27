import { PromptScore } from "peerbench";
import { Loader2 } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export type ScoresPreviewProps = {
  scores: PromptScore[];
  allScores?: PromptScore[];
  totalScores?: number;
  isLoading?: boolean;
};

export default function ScoresPreview({
  scores: sampleScores,
  allScores,
  totalScores,
  isLoading = false,
}: ScoresPreviewProps) {
  const displayScores = allScores || sampleScores;
  const count = totalScores !== undefined ? totalScores : displayScores.length;

  return (
    <div
      className={`border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
    >
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="preview" className="border-none">
          <AccordionTrigger className="w-full flex justify-between items-center text-left group hover:cursor-pointer">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Scores Preview
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
                count > 0 && (
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {totalScores !== undefined
                      ? `${displayScores.length} of ${totalScores} scores`
                      : `${displayScores.length} scores`}
                  </span>
                )
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="overflow-hidden">
            <div className="mt-4 space-y-4">
              {!isLoading && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p className="text-sm">Preview is not available</p>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
