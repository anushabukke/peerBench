import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";
import useSWR from "swr";
import { apiFetcher } from "@/lib/swr/api-fetcher";
import { SWR_GET_FILES } from "@/lib/swr/keys";
import type { ResponseType } from "../api/v1/files/get";

interface PageContextValue {
  items: ResponseType["data"];
  total: number;
  loading: boolean;
  error: string | null;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  pageSize: number;
  setPageSize: Dispatch<SetStateAction<number>>;
  handlePageSizeChange: (size: number) => void;
}

const PageContext = createContext<PageContextValue | undefined>(undefined);

interface PageContextProviderProps {
  children: ReactNode;
  initialPage?: number;
  initialPageSize?: number;
}

export const PageContextProvider = ({ children }: PageContextProviderProps) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  // Build the API URL with pagination parameters
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("pageSize", pageSize.toString());
    return `${SWR_GET_FILES}?${params.toString()}`;
  }, [page, pageSize]);

  // Use SWR to fetch data
  const { data, error, isLoading } = useSWR<ResponseType>(apiUrl, apiFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 60000, // 1 minute
  });

  // Extract data from SWR response
  const items = data?.data || [];
  const total = data?.pagination?.totalCount || 0;
  const loading = isLoading;
  const errorMessage = error ? error.message || "Failed to fetch files" : null;

  return (
    <PageContext.Provider
      value={{
        items,
        total,
        loading,
        error: errorMessage,
        page,
        setPage,
        pageSize,
        setPageSize,
        handlePageSizeChange,
      }}
    >
      {children}
    </PageContext.Provider>
  );
};

export function usePageContext() {
  const ctx = useContext(PageContext);
  if (!ctx)
    throw new Error("usePageContext must be used within a PageContextProvider");
  return ctx;
}
