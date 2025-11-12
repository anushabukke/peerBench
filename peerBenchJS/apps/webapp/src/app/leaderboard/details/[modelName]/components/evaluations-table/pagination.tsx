"use client";

import { Pagination } from "@/components/pagination";
import { useRouter, useSearchParams } from "next/navigation";

export interface EvaluationsTablePaginationProps {
  page: number;
  pageSize: number;
  totalEvaluations: number;
}

export default function EvaluationsTablePagination({
  page,
  pageSize,
  totalEvaluations,
}: EvaluationsTablePaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const onPageSizeChange = (pageSize: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    params.set("pageSize", pageSize.toString());
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const onPageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page === 1) {
      params.delete("page");
    } else {
      params.set("page", page.toString());
    }
    params.set("pageSize", pageSize.toString());
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <Pagination
      currentPage={page}
      pageSize={pageSize}
      totalItemCount={totalEvaluations}
      onPageSizeChange={onPageSizeChange}
      onPageChange={onPageChange}
    />
  );
}
