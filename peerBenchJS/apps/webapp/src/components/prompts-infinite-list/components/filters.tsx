"use client";

import PromptSearchFilters from "@/components/prompt-search-filters";
import PromptStatusFilter from "@/components/prompt-search-filters/components/prompt-status-filter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LucideFunnel } from "lucide-react";
import { usePromptSearchFiltersContext } from "@/components/prompt-search-filters/context";

export function Filters({ isUserLoggedIn, canManagePromptStatus }: { isUserLoggedIn: boolean; canManagePromptStatus?: boolean }) {
  const { isAnyFilterApplied } = usePromptSearchFiltersContext();

  return (
    <div className="space-y-4">
      {canManagePromptStatus && (
        <PromptStatusFilter disabled={!canManagePromptStatus} />
      )}
      <Accordion
        type="single"
        collapsible
        defaultValue={isAnyFilterApplied ? "filters" : undefined}
      >
        <AccordionItem value="filters" className="group border-none">
          <AccordionTrigger className="pb-5">
            <div className="flex items-center gap-2">
              <LucideFunnel size={16} />
              Filters
            </div>
          </AccordionTrigger>
          <AccordionContent
            forceMount
            className="group-data-[state=closed]:hidden border-t border-t-gray-200 pt-5"
          >
            <PromptSearchFilters isUserLoggedIn={isUserLoggedIn} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
