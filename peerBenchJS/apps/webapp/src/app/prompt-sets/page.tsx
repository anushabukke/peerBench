"use client";

import { PromptSetCard } from "./components/prompt-set-card";
import LoadingSpinner from "@/components/loading-spinner";
import PromptSetCardSkeletonCard from "./components/prompt-set-card-skeleton";
import { errorMessage } from "@/utils/error-message";
import { useInfinitePromptSets } from "@/lib/react-query/use-infinite-prompt-sets";

export default function PromptSetsPage() {
  const {
    data: promptSets,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    isEmpty,
    error,
    loadingRef,
  } = useInfinitePromptSets();

  // Show error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Benchmarks</h1>
        <p className="text-sm text-gray-500 mb-8">
          Browse and explore available benchmarks for testing and evaluation.
        </p>
        <div className="flex flex-col items-center justify-center py-12 text-red-500">
          <p className="text-lg font-medium">Error loading Benchmarks</p>
          <p className="text-sm text-gray-600 mt-2">
            {errorMessage(error) || "Something went wrong. Please try again."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Benchmarks</h1>
      <p className="text-sm text-gray-500 mb-8">
        Browse and explore available Benchmarks for testing and reviewing.
      </p>

      <div className="space-y-4">
        {isLoading ? (
          // Show skeleton cards while loading first page
          Array.from({ length: 10 }).map((_, index) => (
            <PromptSetCardSkeletonCard key={`skeleton-${index}`} />
          ))
        ) : (
          <>
            {isEmpty && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <p className="text-lg">No Benchmarks found</p>
              </div>
            )}
            {promptSets?.map((promptSet) => (
              <PromptSetCard key={promptSet.id} item={promptSet} />
            ))}

            {/* Infinite scroll trigger */}
            <div ref={loadingRef} className="flex justify-center py-4">
              <div className="flex flex-col justify-center">
                {isFetchingNextPage && <LoadingSpinner position="block" />}
                {!hasNextPage && promptSets.length > 0 && (
                  <p className="text-gray-500 text-sm">
                    No more benchmarks to load
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
