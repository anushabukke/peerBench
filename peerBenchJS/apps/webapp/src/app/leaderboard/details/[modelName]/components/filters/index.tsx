"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SlidersHorizontal } from "lucide-react";
import { reactSelectStyles } from "@/lib/styles/react-select-styles";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getEvaluationFilters } from "../../actions/get-evaluation-filters";
import { useDocumentBody } from "@/lib/hooks/use-document-body";
import useSWR from "swr";
import FiltersSkeleton from "./skeleton";
import Select from "react-select";

type ContextFilterOption = {
  label: string;
  value: string;
  contextType: "prompt-set" | "protocol";
};

type FilterValues = {
  context: ContextFilterOption | null;
  provider: string | null;
  promptType: string | null;
};

export default function Filters({ modelName }: { modelName: string }) {
  const [filters, setFilters] = useState<FilterValues>({
    context: null,
    provider: null,
    promptType: null,
  });
  const router = useRouter();
  const searchParams = useSearchParams();
  const bodyEl = useDocumentBody();

  // Fetch filter options using SWR
  const { data: filterOptions, isLoading: isFilterDataLoading } = useSWR(
    `evaluation-filters-${modelName}`,
    async () => {
      const result = await getEvaluationFilters(modelName);
      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    },
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnMount: true,
    }
  );

  const updateUrlParams = (newFilters: FilterValues) => {
    const params = new URLSearchParams(searchParams);

    if (newFilters.context !== null) {
      params.set("contextType", newFilters.context.contextType);
      params.set("context", newFilters.context.value);
    } else {
      params.delete("contextType");
      params.delete("context");
    }

    if (newFilters.provider !== null) {
      params.set("provider", newFilters.provider);
    } else {
      params.delete("provider");
    }

    if (newFilters.promptType !== null) {
      params.set("promptType", newFilters.promptType);
    } else {
      params.delete("promptType");
    }

    // Reset pagination if there is
    if (params.get("page")) {
      params.set("page", "1");
    }

    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleOnContextFilterChange = (
    newContext: ContextFilterOption | null
  ) => {
    const newFilters = {
      ...filters,
      context: newContext,
    };
    setFilters(newFilters);
    updateUrlParams(newFilters);
  };

  const handleOnProviderFilterChange = (newProvider: string | null) => {
    const newFilters = {
      ...filters,
      provider: newProvider,
    };
    setFilters(newFilters);
    updateUrlParams(newFilters);
  };

  const handleOnPromptTypeFilterChange = (newPromptType: string | null) => {
    const newFilters = {
      ...filters,
      promptType: newPromptType,
    };
    setFilters(newFilters);
    updateUrlParams(newFilters);
  };

  // Initialize filters from URL params when filter options are loaded
  useEffect(() => {
    if (filterOptions && !isFilterDataLoading) {
      const contextType = searchParams.get("contextType");
      const context = searchParams.get("context");
      const provider = searchParams.get("provider");
      const promptType = searchParams.get("promptType");

      const newFilters: FilterValues = {
        context: null,
        provider: null,
        promptType: null,
      };

      if (contextType && context) {
        // Find the corresponding context filter in the available options using the query param
        const contextFilter = filterOptions.contexts.find(
          (c) =>
            c.type === contextType &&
            (c.type === "prompt-set" // compare values based on context type
              ? c.id.toString() === context
              : c.address === context)
        );

        if (contextFilter) {
          newFilters.context = {
            contextType: contextFilter.type,
            label:
              contextFilter.type === "prompt-set"
                ? contextFilter.title
                : contextFilter.name,
            value:
              contextFilter.type === "prompt-set"
                ? contextFilter.id.toString()
                : contextFilter.address,
          };
        }
      }

      if (provider) {
        newFilters.provider = provider;
      }

      if (promptType) {
        newFilters.promptType = promptType;
      }

      setFilters(newFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterOptions, isFilterDataLoading]);

  // Show skeleton while loading
  if (isFilterDataLoading) {
    return <FiltersSkeleton />;
  }

  return (
    <Accordion type="single" collapsible defaultValue="filters">
      <AccordionItem value="filters">
        <AccordionTrigger className="pl-4 pt-4 pb-4 [&[data-state=open]]:rounded-b-none text-sm font-medium bg-background">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} />
            Filters
          </div>
        </AccordionTrigger>
        <AccordionContent className="p-5 border-t border-t-gray-100 bg-background">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filterOptions?.contexts && filterOptions.contexts.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Context
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      isClearable
                      value={filters.context}
                      onChange={handleOnContextFilterChange}
                      options={filterOptions.contexts.map((c) => ({
                        label: c.type === "prompt-set" ? c.title : c.name,
                        value:
                          c.type === "prompt-set" ? c.id.toString() : c.address,
                        contextType: c.type,
                      }))}
                      styles={reactSelectStyles}
                      menuPortalTarget={bodyEl}
                      noOptionsMessage={() => "No options available"}
                    />
                  </div>
                </div>
              </div>
            )}
            {filterOptions?.providers && filterOptions.providers.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Provider
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      isClearable
                      value={
                        filters.provider
                          ? { label: filters.provider, value: filters.provider }
                          : null
                      }
                      onChange={(option) =>
                        handleOnProviderFilterChange(option?.value || null)
                      }
                      options={filterOptions.providers.map((provider) => ({
                        label: provider,
                        value: provider,
                      }))}
                      styles={reactSelectStyles}
                      menuPortalTarget={bodyEl}
                      noOptionsMessage={() => "No options available"}
                    />
                  </div>
                </div>
              </div>
            )}
            {filterOptions?.promptTypes &&
              filterOptions.promptTypes.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Prompt Type
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Select
                        isClearable
                        value={
                          filters.promptType
                            ? {
                                label: filters.promptType,
                                value: filters.promptType,
                              }
                            : null
                        }
                        onChange={(option) =>
                          handleOnPromptTypeFilterChange(option?.value || null)
                        }
                        options={filterOptions.promptTypes.map(
                          (promptType) => ({
                            label: promptType,
                            value: promptType,
                          })
                        )}
                        styles={reactSelectStyles}
                        menuPortalTarget={bodyEl}
                        noOptionsMessage={() => "No options available"}
                      />
                    </div>
                  </div>
                </div>
              )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
