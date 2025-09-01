import { db } from "@/database/client";

/**
 * @deprecated Use `DBTransaction` instead
 */
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type DBTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * @deprecated Use `PaginatedResponse`, `PaginationResponse` instead
 */
export type PaginatedResult<T> = {
  data: T[];
  pagination: {
    totalRecords: number;
    totalPages: number;
    currentPage: number;
    nextPage: number | null;
    previousPage: number | null;
  };
};

export type PaginationOptions = {
  page?: number;
  pageSize?: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};
