"use client";

import { InspectTable } from "./components/inspect-table";
import { usePageContext } from "./context";
import { Pagination } from "@/components/pagination";
import { useSearchParams, useRouter } from "next/navigation";
import LoadingSpinner from "@/components/loading-spinner";
import React, { useEffect } from "react";

export default function InspectPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    page,
    setPage,
    setPageSize,
    pageSize,
    loading,
    error,
    items,
    total,
    handlePageSizeChange,
  } = usePageContext();

  // Parse initial values from URL
  const initialPage = parseInt(searchParams.get("page") || "1", 10);
  const initialPageSize = parseInt(searchParams.get("pageSize") || "10", 10);

  // Update URL when page or pageSize changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    router.replace(`?${params.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  // Initialize page and pageSize from URL on mount
  useEffect(() => {
    setPage(initialPage);
    setPageSize(initialPageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="flex flex-col gap-4 mx-auto max-w-7xl py-3">
      <h1 className="text-3xl font-bold mb-6">Audit Logs</h1>
      <p className="text-gray-600 mb-4">
        Here you can view the raw audit logs that include detailed information
        about the uploaded Prompts, results and so on.
      </p>

      {loading ? (
        <LoadingSpinner position="block" />
      ) : error ? (
        <div className="text-center py-8 text-red-500">{error}</div>
      ) : (
        <div className="flex flex-col gap-1">
          <InspectTable items={items} />
          <Pagination
            currentPage={page}
            pageSize={pageSize}
            totalItemCount={total}
            disabled={loading}
            onPageSizeChange={handlePageSizeChange}
            onPageChange={setPage}
          />
        </div>
      )}
    </main>
  );
}
