"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { Filters } from "./filters";

export function Search({
  urlParamName = "search",
  debounceTimeout = 300,
}: {
  urlParamName?: string;
  debounceTimeout?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || ""
  );
  const debouncedSearchTerm = useDebounce(searchTerm, debounceTimeout);

  const updateSearchParams = useCallback(
    (term: string) => {
      const params = new URLSearchParams(searchParams);
      if (term) {
        params.set(urlParamName, term);
      } else {
        params.delete(urlParamName);
      }
      router.push(`?${params.toString()}`);
    },
    [router, searchParams, urlParamName]
  );

  useEffect(() => {
    updateSearchParams(debouncedSearchTerm);
  }, [debouncedSearchTerm, updateSearchParams]);

  const handleSearch = () => {
    updateSearchParams(searchTerm);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md px-6 pt-6 border border-gray-200 dark:border-gray-700 flex flex-col gap-4">
      <div className="flex gap-3">
        <Input
          type="text"
          placeholder="Enter prompt ID or content..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
        />
        <Button onClick={handleSearch} className="h-12 px-6">
          Search
        </Button>
      </div>
      <Filters />
    </div>
  );
}
