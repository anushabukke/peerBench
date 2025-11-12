"use client";

import { cn } from "@/utils/cn";
import { PromptSearchFiltersProps } from "../prompt-search-filters";
import { PromptSearchFiltersContextProvider } from "../prompt-search-filters/context";
import { Results } from "./components/results";
import { Search } from "./components/search";
import { ComponentContextProvider } from "./context";

export interface PromptsInfiniteListProps {
  isUserLoggedIn: boolean;
  fixedFilters?: PromptSearchFiltersProps["fixedFilters"];
  className?: string;
  canManagePromptStatus?: boolean;
}

function Comp({ isUserLoggedIn, className, canManagePromptStatus }: PromptsInfiniteListProps) {
  return (
    <>
      <div className={cn("space-y-4 mb-8", className)}>
        <Search isUserLoggedIn={isUserLoggedIn} canManagePromptStatus={canManagePromptStatus} />
      </div>

      <Results />
    </>
  );
}

export default function PromptsInfiniteList({
  fixedFilters,
  ...props
}: PromptsInfiniteListProps) {
  return (
    <PromptSearchFiltersContextProvider fixedFilters={fixedFilters}>
      <ComponentContextProvider>
        <Comp {...props} />
      </ComponentContextProvider>
    </PromptSearchFiltersContextProvider>
  );
}
