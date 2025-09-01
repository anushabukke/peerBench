"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { createContext, useContext, useTransition } from "react";

export type FilterOptionType = {
  value: string;
  label: string;
  type?: "promptSet" | "protocol";
};
export type FilterProviderOptionType = {
  value: string;
  label: string;
};

type PageContextValue = {
  isRouting: boolean;
  filters: {
    context: FilterOptionType | null;
    provider: FilterOptionType | null;
    promptType: FilterOptionType | null;
  };
  filterOptions: {
    contexts: FilterOptionType[];
    providers: FilterOptionType[];
    promptTypes: FilterOptionType[];
  };
  applyFilters: (filters: Record<string, FilterOptionType | null>) => void;
  navigate: (url: string) => void;
};

const PageContext = createContext<PageContextValue | undefined>(undefined);

export const PageContextProvider = (props: {
  children: React.ReactNode;
  contexts: FilterOptionType[];
  providers: FilterOptionType[];
  promptTypes: FilterOptionType[];
  initialContextFilter?: string;
  initialProviderFilter?: string;
  initialPromptTypeFilter?: string;
}) => {
  // const selectedContextFilter = props.contexts.find(
  //   (context) => context.value === props.initialContextFilter
  // );
  // const selectedProviderFilter = props.providers.find(
  //   (provider) => provider.value === props.initialProviderFilter
  // );

  const router = useRouter();
  const searchParams = useSearchParams();
  const [isRouting, startTransition] = useTransition();

  // Helper function to find filter by value
  const findFilterByValue = (options: FilterOptionType[], value?: string) => {
    return value
      ? options.find((option) => option.value === value) || null
      : null;
  };

  // Unified: apply one or more filters at once
  const applyFilters = (filters: Record<string, FilterOptionType | null>) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(filters).forEach(([filterKey, value]) => {
        // Special handling for context filter
        if (filterKey === "context") {
          if (value?.type === "promptSet") {
            params.set("promptSet", value.value);
            params.delete("protocol");
          } else if (value?.type === "protocol") {
            params.set("protocol", value.value);
            params.delete("promptSet");
          } else {
            params.delete("promptSet");
            params.delete("protocol");
          }
        } else {
          // Handle other filters normally
          if (!value) {
            params.delete(filterKey);
          } else {
            params.set(filterKey, value.value);
          }
        }
      });

      // Reset page to 1 if it's set
      if (params.has("page")) {
        params.set("page", "1");
      }
      router.replace(`?${params.toString()}`);
    });
  };

  const navigate = (url: string) => {
    startTransition(() => {
      // If the URL starts with ?, treat it as search params to merge
      if (url.startsWith("?")) {
        const newParams = new URLSearchParams(url.substring(1));
        const currentParams = new URLSearchParams(searchParams.toString());

        // Merge the new params with existing ones
        for (const [key, value] of newParams.entries()) {
          currentParams.set(key, value);
        }

        router.push(`?${currentParams.toString()}`);
      } else {
        // For absolute URLs, navigate directly
        router.push(url);
      }
    });
  };

  // Helper function to find context filter from promptSet or protocol params
  const findContextFilter = () => {
    const promptSet = searchParams.get("promptSet");
    const protocol = searchParams.get("protocol");

    if (promptSet) {
      return findFilterByValue(props.contexts, promptSet);
    } else if (protocol) {
      return findFilterByValue(props.contexts, protocol);
    }
    return null;
  };

  return (
    <PageContext.Provider
      value={{
        isRouting,
        filters: {
          context: findContextFilter(),
          provider: findFilterByValue(
            props.providers,
            searchParams.get("provider") || undefined
          ),
          promptType: findFilterByValue(
            props.promptTypes,
            searchParams.get("promptType") || undefined
          ),
        },
        filterOptions: {
          contexts: props.contexts,
          providers: props.providers,
          promptTypes: props.promptTypes,
        },
        applyFilters,
        navigate,
      }}
    >
      {props.children}
    </PageContext.Provider>
  );
};

export const usePageContext = () => {
  const context = useContext(PageContext);
  if (!context) {
    throw new Error("usePageContext must be used within a PageContextProvider");
  }
  return context;
};
