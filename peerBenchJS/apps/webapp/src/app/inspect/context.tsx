import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";
import { FileListItem } from "@/services/file.service";
import { usePreloader } from "@/hooks/usePreloader";

interface PageContextValue {
  items: FileListItem[];
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
  const { getCachedData, isDataAvailable, isPreloading } = usePreloader();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [items, setItems] = useState<FileListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  // Load results
  useEffect(() => {
    setLoading(true);
    setError(null);

    // Try to get cached data first for the first page
    if (page === 1) {
      const cachedInspect = getCachedData('inspect');
      if (cachedInspect) {
        setItems(cachedInspect.files);
        setTotal(cachedInspect.total);
        setLoading(false);
        return;
      }
    }

    // If no cached data or not first page, fetch fresh data
    if ((!isDataAvailable('inspect') && !isPreloading) || page !== 1) {
      fetch(`/api/v1/inspect/files?page=${page}&pageSize=${pageSize}`)
        .then((response) => {
          if (response.ok) {
            return response.json();
          }
          throw new Error('Failed to fetch files');
        })
        .then((data) => {
          setItems(data.results);
          setTotal(data.total);
        })
        .catch((err) => {
          setError(err.message || "Failed to fetch audit files");
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      // Still preloading, keep loading state
      setLoading(true);
    }
  }, [page, pageSize, getCachedData, isDataAvailable, isPreloading]);

  return (
    <PageContext.Provider
      value={{
        items,
        total,
        loading,
        error,
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
