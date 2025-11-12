"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pagination } from "../pagination";
import { useState, useEffect, useCallback } from "react";
import CoauthorsTableRow from "./row";
import { LucideLoader2, LucideUser } from "lucide-react";
import { CoAuthorItem, usePromptSetAPI } from "@/lib/hooks/use-prompt-set-api";

export interface CoauthorsTableProps {
  promptSetId: number;
  isPromptSetPublic?: boolean;
  hasUserEditPermission?: boolean;
  hasUserRemovePermission?: boolean;
  excludePublicCoAuthors?: boolean;
}

export function CoauthorsTable({
  promptSetId,
  isPromptSetPublic,
  hasUserEditPermission,
  hasUserRemovePermission,
  excludePublicCoAuthors,
}: CoauthorsTableProps) {
  const promptSetAPI = usePromptSetAPI();
  const [coauthors, setCoauthors] = useState<CoAuthorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [totalCount, setTotalCount] = useState(0);

  const fetchCoauthors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await promptSetAPI.getCoauthors(promptSetId, {
        page: currentPage,
        pageSize: pageSize,
        excludePublicCoAuthors,
      });
      setCoauthors(response.data);
      setTotalCount(response.pagination.totalCount);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch coauthors"
      );
    } finally {
      setLoading(false);
    }
  }, [
    promptSetAPI,
    promptSetId,
    currentPage,
    pageSize,
    excludePublicCoAuthors,
  ]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  useEffect(() => {
    fetchCoauthors();
  }, [fetchCoauthors]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LucideUser className="h-5 w-5" />
            Co-authors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <LucideLoader2 className="animate-spin" size={24} />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LucideUser className="h-5 w-5" />
            Co-authors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-red-500 mb-4">
              <LucideUser className="h-12 w-12 mx-auto mb-2" />
              <p className="text-sm">{error}</p>
            </div>
            <Button onClick={fetchCoauthors} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LucideUser className="h-5 w-5" />
          Co-authors
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {coauthors.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <LucideUser className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p>No co-authors found</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {coauthors.map((coauthor) => (
                  <CoauthorsTableRow
                    key={coauthor.userId}
                    coauthor={coauthor}
                    promptSetId={promptSetId}
                    hasUserEditPermission={hasUserEditPermission}
                    hasUserRemovePermission={hasUserRemovePermission}
                    isPromptSetPublic={isPromptSetPublic}
                  />
                ))}
              </div>

              {totalCount > pageSize && (
                <Pagination
                  currentPage={currentPage}
                  pageSize={pageSize}
                  totalItemCount={totalCount}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                  sizeOptions={[5, 10, 20, 50]}
                />
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
