"use client";

import { cn } from "@/utils/cn";
import { PromptSearchFiltersContextProvider } from "@/components/prompt-search-filters/context";
import { ComponentContextProvider } from "@/components/prompts-infinite-list/context";
import { Search } from "@/components/prompts-infinite-list/components/search";
import { CuratedLeaderboard } from "./curated-leaderboard";

export interface CuratedLeaderboardViewProps {
  isUserLoggedIn: boolean;
  className?: string;
}

function Comp({ isUserLoggedIn, className }: CuratedLeaderboardViewProps) {
  return (
    <>
      <CuratedLeaderboard />

      <div className={cn("space-y-4 mt-8", className)}>
        <Search isUserLoggedIn={isUserLoggedIn} />
      </div>
    </>
  );
}

export function CuratedLeaderboardView(props: CuratedLeaderboardViewProps) {
  return (
    <PromptSearchFiltersContextProvider>
      <ComponentContextProvider>
        <Comp {...props} />
      </ComponentContextProvider>
    </PromptSearchFiltersContextProvider>
  );
}
