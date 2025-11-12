import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useCallback,
} from "react";
import { usePromptSearchFiltersContext } from "../prompt-search-filters/context";
import { PromptSearchFiltersProps } from "../prompt-search-filters";
import { useDebouncedCallback } from "@/lib/hooks/use-debounce";
import { useRouter, useSearchParams } from "next/navigation";

export interface ComponentContextType {
  isFilterFixed: (
    key: keyof NonNullable<PromptSearchFiltersProps["fixedFilters"]>
  ) => boolean;
  search: string;
  setSearch: (search: string) => void;
}

const ComponentContext = createContext<ComponentContextType | null>(null);

export interface ComponentContextProviderProps {
  children: ReactNode;
}

export function ComponentContextProvider({
  children,
}: ComponentContextProviderProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const promptFiltersCtx = usePromptSearchFiltersContext();
  const [search, setSearchState] = useState<string>(
    searchParams.get("search") ?? ""
  );

  const isFilterFixed = useCallback(
    (
      key: keyof NonNullable<PromptSearchFiltersProps["fixedFilters"]>
    ): boolean => {
      return promptFiltersCtx.fixedFilters
        ? promptFiltersCtx.fixedFilters[key] !== undefined
        : false;
    },
    [promptFiltersCtx.fixedFilters]
  );

  const setSearch = useDebouncedCallback((search: string) => {
    setSearchState(search);

    const params = new URLSearchParams(searchParams);
    params.set("search", search);

    if (search) {
      router.replace(`?${params.toString()}`, {
        scroll: false,
      });
    } else {
      params.delete("search");
      router.replace(`?${params.toString()}`, {
        scroll: false,
      });
    }
  }, 500);

  return (
    <ComponentContext.Provider
      value={{
        isFilterFixed,
        search,
        setSearch,
      }}
    >
      {children}
    </ComponentContext.Provider>
  );
}

export function useComponentContext() {
  const context = useContext(ComponentContext);
  if (!context) {
    throw new Error(
      "useComponentContext must be used inside ComponentContextProvider"
    );
  }
  return context;
}
