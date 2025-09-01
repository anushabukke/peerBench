"use client";

import type { PromptSetListItem } from "@/services/promptset.service";
import { PromptSetListItem as PromptSetListItemComponent } from "./components/PromptSetListItem";
import { useEffect, useState, useCallback, useRef } from "react";
import { Loader2 } from "lucide-react";
import { getPromptSetList } from "@/lib/actions/get-prompt-set-list";

const PAGE_SIZE = 3;

export default function ReviewPage() {
  const [promptSets, setPromptSets] = useState<PromptSetListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const observer = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  const loadPromptSets = useCallback(async (pageNum: number) => {
    try {
      setLoading(true);
      setError(null);

      const response = await getPromptSetList({
        page: pageNum,
        pageSize: PAGE_SIZE,
      });

      if (pageNum === 1) {
        setPromptSets(response.data);
      } else {
        setPromptSets((prev) => [...prev, ...response.data]);
      }

      // Check if there are more pages
      setHasMore(response.pagination.nextPage !== null);
      setCurrentPage(pageNum);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load prompt sets"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPromptSets(1);
  }, [loadPromptSets]);

  const lastElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (loading) return;

      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadPromptSets(currentPage + 1);
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, hasMore, loadPromptSets, currentPage]
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Review Prompt Sets</h1>
      <p className="text-sm text-gray-500 mb-8">
        Review the prompts from various prompt sets to help improve the quality
        of the datasets.
      </p>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {promptSets.map((promptSet, index) => (
          <div
            key={promptSet.id}
            ref={index === promptSets.length - 1 ? lastElementRef : undefined}
          >
            <PromptSetListItemComponent item={promptSet} />
          </div>
        ))}
      </div>

      {loading && (
        <div ref={loadingRef} className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!hasMore && promptSets.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No more prompt sets to load.</p>
        </div>
      )}

      {!loading && promptSets.length === 0 && !error && (
        <div className="text-center py-12">
          <p className="text-gray-500">No prompt sets found.</p>
        </div>
      )}
    </div>
  );
}
