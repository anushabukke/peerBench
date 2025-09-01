"use client";

import { apiFetcher } from "@/app/swr/api-fetcher";
import { PromptCard } from "./prompt-card";
import { SWR_GET_PROMPTS } from "@/app/swr/keys";
import { type GetPromptsData } from "@/services/prompt.service";
import { useEffect, useRef, useCallback, useMemo } from "react";
import useSWRInfinite from "swr/infinite";
import LoadingSpinner from "@/components/loading-spinner";
import { useSearchParams } from "next/navigation";
import { PaginatedResponse } from "@/types/db";

const PAGE_SIZE = 10;

export function Results() {
  const searchParams = useSearchParams();

  // Extract all filter parameters from URL
  const filters = useMemo(() => {
    const page = searchParams.get("page");
    const promptSetId = searchParams.get("promptSetId");
    const search = searchParams.get("search");
    const tags = searchParams.getAll("tags");
    const uploaderId = searchParams.get("uploaderId");
    const fileId = searchParams.get("fileId");
    const excludeReviewed = searchParams.get("excludeReviewed") === "true";
    const onlyReviewed = searchParams.get("onlyReviewed") === "true";
    const reviewedByUserId = searchParams.get("reviewedByUserId");
    const orderBy = searchParams.getAll("orderBy");

    return {
      page: page ? parseInt(page) : 1,
      promptSetId:
        promptSetId && promptSetId !== "__ALL__"
          ? parseInt(promptSetId)
          : undefined,
      search: search || undefined,
      tags: tags.length > 0 ? tags : undefined,
      uploaderId: uploaderId || undefined,
      fileId: fileId ? parseInt(fileId) : undefined,
      excludeReviewed: excludeReviewed || undefined,
      onlyReviewed: onlyReviewed || undefined,
      reviewedByUserId: reviewedByUserId || undefined,
      orderBy: orderBy.length > 0 ? orderBy : undefined,
    };
  }, [searchParams]);

  // Build the API URL with all filter parameters
  const getKey = useCallback(
    (index: number) => {
      const params = new URLSearchParams();
      params.set("page", (index + 1).toString());
      params.set("pageSize", PAGE_SIZE.toString());

      if (filters.promptSetId) {
        params.set("promptSetId", filters.promptSetId.toString());
      }
      if (filters.search) {
        // Search can be done on question, answer or id
        params.set("search", filters.search || "");
        params.set("searchId", filters.search || "");
      }
      if (filters.tags) {
        filters.tags.forEach((tag) => params.append("tags", tag));
      }
      if (filters.uploaderId) {
        params.set("uploaderId", filters.uploaderId);
      }
      if (filters.fileId) {
        params.set("fileId", filters.fileId.toString());
      }
      if (filters.excludeReviewed) {
        params.set("excludeReviewed", filters.excludeReviewed.toString());
      }
      if (filters.onlyReviewed) {
        params.set("onlyReviewed", filters.onlyReviewed.toString());
      }
      if (filters.reviewedByUserId) {
        params.set("reviewedByUserId", filters.reviewedByUserId);
      }
      if (filters.orderBy) {
        filters.orderBy.forEach((order) => params.append("orderBy", order));
      }

      return `${SWR_GET_PROMPTS}?${params.toString()}`;
    },
    [filters]
  );

  const { data, size, setSize, isLoading, error } = useSWRInfinite(
    getKey,
    async (url) => apiFetcher<PaginatedResponse<GetPromptsData>>(url),
    {
      revalidateOnFocus: false,
      // Reset pagination when filters change
      revalidateFirstPage: false,
    }
  );

  // Safely extract data with error handling
  // const totalCount = data
  //   ? data
  //       .map((page) => {
  //         try {
  //           return page?.pagination?.totalCount || 0;
  //         } catch (error) {
  //           console.warn('Error reading pagination data:', error);
  //           return 0;
  //         }
  //       })
  //       .reduce((acc, curr) => acc + curr, 0)
  //   : 0;

  const prompts: GetPromptsData[] = data
    ? data
        .map((page) => {
          try {
            return page?.data || [];
          } catch (error) {
            console.warn("Error reading page data:", error);
            return [];
          }
        })
        .flat()
    : [];

  const isLoadingMore =
    isLoading || (size > 0 && data && typeof data[size - 1] === "undefined");

  // Safely check if data is empty
  const isEmpty = (() => {
    try {
      return data?.[0]?.data?.length === 0;
    } catch (error) {
      console.warn("Error checking if data is empty:", error);
      return true;
    }
  })();

  const isReachingEnd = (() => {
    try {
      return (
        isEmpty || (data && data[data.length - 1]?.data?.length < PAGE_SIZE)
      );
    } catch (error) {
      console.warn("Error checking if reaching end:", error);
      return true;
    }
  })();

  // Infinite scroll functionality
  const observerRef = useRef<IntersectionObserver | undefined>(undefined);
  const loadingRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    if (!isLoadingMore && !isReachingEnd) {
      setSize(size + 1);
    }
  }, [isLoadingMore, isReachingEnd, setSize, size]);

  useEffect(() => {
    const element = loadingRef.current;
    if (!element) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && !isReachingEnd) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMore, isLoadingMore, isReachingEnd]);

  // Show loading spinner for initial load
  if (isLoading && !data) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner position="block" />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-red-500">
        <p className="text-lg font-medium">Error loading prompts</p>
        <p className="text-sm text-gray-600 mt-2">
          {error.message || "Something went wrong. Please try again."}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Show empty state
  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <p className="text-lg">No prompts found</p>
        <p className="text-sm">Try adjusting your search criteria</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        {prompts?.map((prompt) => (
          <PromptCard
            promptSet={prompt.promptSet}
            key={prompt.id}
            id={prompt.id}
            href={`/explore/prompts/${prompt.id}`}
            fullPrompt={prompt.question}
            tags={prompt.metadata?.tags}
            testResults={prompt.testResults}
          />
        ))}

        <div ref={loadingRef} className="flex justify-center py-4">
          {isLoadingMore && (
            <div className="flex items-center gap-2 text-gray-500">
              <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
              <span className="text-sm">Loading more prompts...</span>
            </div>
          )}
          {isReachingEnd && prompts.length > 0 && (
            <p className="text-sm text-gray-500">No more prompts to load</p>
          )}
        </div>
      </div>
    </div>
  );
}
