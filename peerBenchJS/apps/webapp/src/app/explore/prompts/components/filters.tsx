"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import MultiSelect from "@/components/ui/multi-select";
import { Filter } from "lucide-react";
import { getPromptFiltersAction } from "@/lib/actions/get-prompt-filters";

interface PromptSet {
  title: string;
  id: number;
}

interface Tag {
  value: string;
  label: string;
  [key: string]: string | boolean | undefined;
}

export function Filters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [promptSet, setPromptSet] = useState(
    searchParams.get("promptSetId") || "_null"
  );
  const [selectedTags, setSelectedTags] = useState<Tag[]>(() => {
    const tagsParam = searchParams.get("tags");
    if (tagsParam) {
      return tagsParam.split(",").map((tag) => ({
        value: tag,
        label: tag,
      }));
    }
    return [];
  });
  const [uploaderId, setUploaderId] = useState(
    searchParams.get("uploaderId") || ""
  );
  const [fileId, setFileId] = useState(
    searchParams.get("fileId") || ""
  );
  const [excludeReviewed, setExcludeReviewed] = useState(
    searchParams.get("excludeReviewed") === "true"
  );
  const [onlyReviewed, setOnlyReviewed] = useState(
    searchParams.get("onlyReviewed") === "true"
  );
  const [reviewedByUserId, setReviewedByUserId] = useState(
    searchParams.get("reviewedByUserId") || ""
  );

  const [promptSets, setPromptSets] = useState<PromptSet[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch filters data on component mount
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        setIsLoading(true);
        const filtersData = await getPromptFiltersAction();

        if (filtersData) {
          // Transform prompt sets data
          const transformedPromptSets = filtersData.promptSets || [];
          setPromptSets(transformedPromptSets);

          // Transform tags data
          const transformedTags = (filtersData.tags || []).map((tag) => ({
            value: tag,
            label: tag,
          }));
          setTags(transformedTags);
        }
      } catch (error) {
        console.error("Failed to fetch filters:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFilters();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);

    if (promptSet && promptSet !== "_null") {
      params.set("promptSetId", promptSet);
    } else {
      params.delete("promptSetId");
    }

    if (selectedTags.length > 0) {
      selectedTags.forEach((tag) => {
        params.append("tags", tag.value);
      });
    } else {
      params.delete("tags");
    }

    if (uploaderId) {
      params.set("uploaderId", uploaderId);
    } else {
      params.delete("uploaderId");
    }

    if (fileId) {
      params.set("fileId", fileId);
    } else {
      params.delete("fileId");
    }

    if (excludeReviewed) {
      params.set("excludeReviewed", "true");
    } else {
      params.delete("excludeReviewed");
    }

    if (onlyReviewed) {
      params.set("onlyReviewed", "true");
    } else {
      params.delete("onlyReviewed");
    }

    if (reviewedByUserId) {
      params.set("reviewedByUserId", reviewedByUserId);
    } else {
      params.delete("reviewedByUserId");
    }

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptSet, selectedTags, uploaderId, fileId, excludeReviewed, onlyReviewed, reviewedByUserId]);

  const handlePromptSetChange = (value: string) => {
    setPromptSet(value);
  };

  const handleTagsChange = (tags: Tag[]) => {
    setSelectedTags(tags);
  };

  const handleUploaderIdChange = (value: string) => {
    setUploaderId(value);
  };

  const handleFileIdChange = (value: string) => {
    setFileId(value);
  };

  const handleOnlyReviewedChange = (checked: boolean) => {
    setOnlyReviewed(checked);
    // If onlyReviewed is checked, uncheck excludeReviewed
    if (checked) {
      setExcludeReviewed(false);
    }
  };

  const handleExcludeReviewedChange = (checked: boolean) => {
    setExcludeReviewed(checked);
    // If excludeReviewed is checked, uncheck onlyReviewed
    if (checked) {
      setOnlyReviewed(false);
    }
  };

  const handleReviewedByUserIdChange = (value: string) => {
    setReviewedByUserId(value);
  };



  if (isLoading) {
    return (
      <Accordion type="single" collapsible>
        <AccordionItem value="filters" className="border-none">
          <AccordionTrigger className="border-none py-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-6">
            <div className="grid grid-cols-2 gap-6 w-full">
              <div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
              <div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
              <div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
              <div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
              <div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="filters" className="border-none">
        <AccordionTrigger className="border-none py-4 hover:no-underline">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-6">
          <div className="grid grid-cols-2 gap-6 w-full">
            {/* Prompt Set Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Prompt Set
              </label>
              <Select value={promptSet} onValueChange={handlePromptSetChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a prompt set" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="_null">All Prompt Sets</SelectItem>
                    {promptSets.map((set) => (
                      <SelectItem key={set.id} value={set.id.toString()}>
                        {set.title}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Tags Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags
              </label>
              <MultiSelect
                value={selectedTags}
                onChange={handleTagsChange}
                options={tags}
                placeholder="Select tags..."
                className="w-full"
                usePortal
                creatable={true}
              />
            </div>

            {/* Uploader ID Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Uploader ID
              </label>
              <Input
                type="text"
                placeholder="Enter user ID..."
                value={uploaderId}
                onChange={(e) => handleUploaderIdChange(e.target.value)}
                className="w-full"
              />
            </div>

            {/* File ID Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                File ID
              </label>
              <Input
                type="text"
                placeholder="Enter file ID..."
                value={fileId}
                onChange={(e) => handleFileIdChange(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Exclude Reviewed Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Exclude Reviewed By Me
              </label>
              <input
                type="checkbox"
                checked={excludeReviewed}
                onChange={(e) => handleExcludeReviewedChange(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            {/* Only Reviewed Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Only Reviewed By Me
              </label>
              <input
                type="checkbox"
                checked={onlyReviewed}
                onChange={(e) => handleOnlyReviewedChange(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            {/* Reviewed By User ID Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reviewed By User ID
              </label>
              <Input
                type="text"
                placeholder="Enter user ID..."
                value={reviewedByUserId}
                onChange={(e) => handleReviewedByUserIdChange(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
