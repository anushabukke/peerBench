"use client";

import { PromptSearchFiltersProps } from "../prompt-search-filters";
import { PromptSearchFiltersContextProvider } from "../prompt-search-filters/context";
import { Results } from "./components/results";
import { ComponentContextProvider } from "./context";
import { Filters } from "./components/filters";

export interface PromptsInfiniteListProps {
  fixedFilters?: PromptSearchFiltersProps["fixedFilters"];
  canManagePromptStatus?: boolean;
}

function Comp({ canManagePromptStatus }: PromptsInfiniteListProps) {
  return (
    <>
      <Filters canManagePromptStatus={canManagePromptStatus} />
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
