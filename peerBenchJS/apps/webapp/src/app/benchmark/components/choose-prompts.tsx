import { cn } from "@/utils/cn";
import { usePageContext } from "../context";
import { useMemo, useRef } from "react";
import PromptSetSelect, {
  PromptSetSelectOption,
} from "@/components/prompt-set-select";
import { PBParser, Prompt, PromptSchema, DataParser } from "peerbench";
import { toast } from "react-toastify";
import { FileInput } from "@/components/ui/file-input";
import { errorMessage } from "@/utils/error-message";
import { Button } from "@/components/ui/button";
import PromptsPreview from "@/components/prompts-preview";
import { PromptSetAccessReasons } from "@/types/prompt-set";
import { usePromptAPI } from "@/lib/hooks/use-prompt-api";

export default function ChoosePrompts() {
  const ctx = usePageContext();
  const promptsFetchAbortController = useRef<AbortController | null>(null);
  const hasResults = useMemo(
    () => ctx.resultInfos.length > 0,
    [ctx.resultInfos]
  );
  const promptsAPI = usePromptAPI();

  const fileContent = useRef<Uint8Array | null>(null);

  const handleUploadNewPromptsOptionClicked = () => {
    if (ctx.isRunning || ctx.isLoadingPrompts || hasResults) {
      return;
    }

    if (ctx.promptsSource !== "file") {
      ctx.setPromptsSource("file");
      ctx.setSamplePrompts([]);
      ctx.setTotalPromptsCount(0);

      // Clear the other Prompt Set selection
      ctx.existingPromptSetSelectHandler.current?.clear();
    }
  };

  const handleUseExistingPromptsOptionClicked = () => {
    if (ctx.isRunning || ctx.isLoadingPrompts || hasResults) {
      return;
    }

    if (ctx.promptsSource !== "existing") {
      ctx.setPromptsSource("existing");
      ctx.setSamplePrompts([]);
      ctx.setTotalPromptsCount(0);
      // No need to clear other Prompt Set selection because it won't be rendered
    }
  };

  const handlePromptSetLoadingAbortClick = () => {
    promptsFetchAbortController.current?.abort(
      new Error("Loading of the Benchmark is cancelled")
    );
    ctx.existingPromptSetSelectHandler.current?.clear();
  };

  const handleExistingPromptSetSelect = async (
    promptSet: PromptSetSelectOption | null
  ) => {
    if (!promptSet) {
      return;
    }

    try {
      ctx.setIsLoadingPrompts(true);
      ctx.setIsUploadedFileFollowsStandardFormat(true);
      ctx.setTotalPromptsCount(0);

      const pageSize = 250;
      let allPrompts: Prompt[] = [];
      let currentPage = 1;
      let totalPages = 1;

      promptsFetchAbortController.current = new AbortController();

      // TODO: Incrementally fetch Prompts while using them on the fly, not all of them at once.
      // Fetch all pages of prompts using promptAPI
      do {
        const result = await promptsAPI.getPrompts({
          asFileStructured: true,
          promptSetId: [promptSet.id!],
          page: currentPage,
          pageSize: pageSize,
        });

        if (!result.data || !Array.isArray(result.data)) {
          throw new Error("Invalid response format from API");
        }

        allPrompts = [
          ...allPrompts,
          ...result.data.map((rawData) => {
            const parsed = JSON.parse(rawData);

            // Clean up empty values before parsing with Zod
            if (parsed.answer === "" || parsed.answer === null) {
              delete parsed.answer;
            }
            if (parsed.answerKey === "" || parsed.answerKey === null) {
              delete parsed.answerKey;
            }
            if (
              parsed.options === "" ||
              parsed.options === null ||
              (Array.isArray(parsed.options) && parsed.options.length === 0)
            ) {
              delete parsed.options;
            }

            const p = PromptSchema.parse(parsed);
            return {
              ...p,

              // Keep those fields `undefined` if they are empty
              answer: p.answer ? p.answer : undefined,
              answerKey: p.answerKey ? p.answerKey : undefined,
              options: p.options ? p.options : undefined,
            };
          }),
        ];
        totalPages = result.pagination.totalPages;
        currentPage++;

        // Add a small delay to avoid overwhelming the server
        if (currentPage <= totalPages) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } while (currentPage <= totalPages);

      if (allPrompts.length === 0) {
        throw new Error("No Prompts found in this Benchmark");
      }

      ctx.setPromptsToBeTested(allPrompts);
      ctx.setSamplePrompts(allPrompts.slice(0, 5));
      ctx.setTotalPromptsCount(allPrompts.length);
      ctx.setSelectedPromptSet(promptSet);
    } catch (err) {
      console.error(err);
      toast.error(`Couldn't select the Benchmark: ${errorMessage(err)}`);

      ctx.setSelectedPromptSet(null);
      ctx.existingPromptSetSelectHandler.current?.clear();
    } finally {
      ctx.setIsLoadingPrompts(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];

    if (!selectedFile || hasResults) {
      return;
    }

    ctx.setIsUploadedFileFollowsStandardFormat(true);
    ctx.setIsLoadingPrompts(true);
    ctx.setTotalPromptsCount(0);

    try {
      fileContent.current = new Uint8Array(await selectedFile.arrayBuffer());
      const { result, parser } = await DataParser.parseContent(
        fileContent.current
      );

      ctx.setUploadedFileName(selectedFile.name);
      ctx.setPromptsToBeTested(result.prompts);
      ctx.setTotalPromptsCount(result.prompts.length);
      ctx.setSamplePrompts(result.prompts.slice(0, 5));

      if (parser.getIdentifier() !== PBParser.identifier) {
        ctx.setIsUploadedFileFollowsStandardFormat(false);

        toast.warning(
          "Your task file doesn't follow standard PeerBench format. Please use the 'Convert to PB Format' button to convert it. Then use the converted file for benchmarking."
        );
      }
    } catch (err) {
      console.error(err);
      toast.error(errorMessage(err));

      ctx.setUploadedFileName(null);
    } finally {
      ctx.setIsLoadingPrompts(false);
    }
  };

  const handleConvertToPB = async () => {
    try {
      if (!ctx.uploadedFileName) {
        throw new Error("No task file selected");
      }

      const blob = new Blob([JSON.stringify(ctx.promptsToBeTested)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${ctx.uploadedFileName.replace(/\.[^/.]+$/, "")}.peerbench.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(`Failed to convert file: ${errorMessage(error)}`);
      console.error(error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <div className="space-y-6">
        <h2 className="text-start w-full text-2xl font-semibold text-gray-700 mb-4">
          Choose Your Prompts
        </h2>

        {/* Two main options */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Option 1: Upload New Prompts */}
          <div
            className={cn(
              `border-2 rounded-lg p-6 transition-all duration-200 cursor-pointer`,
              ctx.promptsSource === "file"
                ? "border-purple-500 bg-purple-50"
                : ctx.promptsSource === "existing"
                  ? "border-gray-200 bg-gray-50 hover:border-purple-300"
                  : "border-gray-200 hover:border-purple-300",
              (ctx.isRunning || ctx.isUploading || hasResults) &&
                "pointer-events-none opacity-50"
            )}
            onClick={handleUploadNewPromptsOptionClicked}
          >
            <div className="flex items-start space-x-3 mb-4">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  ctx.promptsSource === "file"
                    ? "bg-purple-500 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                A
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <svg
                    className="w-5 h-5 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-700">
                    Upload New Prompts
                  </h3>
                  {ctx.promptsSource === "existing" && (
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                      Click to switch
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  Upload your own task file and associate it with a benchmark
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Task File
                </label>
                <div className="flex gap-3 items-center">
                  <FileInput
                    accept=".json,.jsonl"
                    onChange={handleFileUpload}
                    disabled={
                      ctx.isRunning ||
                      ctx.isUploading ||
                      ctx.isLoadingPrompts ||
                      hasResults
                    }
                  />
                  {ctx.uploadedFileName && (
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {ctx.uploadedFileName}
                    </span>
                  )}
                </div>
              </div>

              {!ctx.isUploadedFileFollowsStandardFormat && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 mb-2">
                    Your file needs to be converted to PeerBench format
                  </p>
                  <Button
                    onClick={handleConvertToPB}
                    className="w-fit"
                    variant="secondary"
                    size="sm"
                    disabled={
                      ctx.isRunning ||
                      ctx.isUploading ||
                      ctx.isLoadingPrompts ||
                      hasResults
                    }
                  >
                    Convert to PB Format
                  </Button>
                </div>
              )}

              {ctx.promptsSource === "file" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Associate with Benchmark
                  </label>
                  <PromptSetSelect
                    accessReason={PromptSetAccessReasons.submitPrompt}
                    ref={ctx.savePromptSetSelectHandler}
                    id="prompt-set-save-select"
                    placeholder="Select a Benchmark..."
                    disabled={
                      ctx.isUploading ||
                      ctx.isResultsUploaded ||
                      ctx.isRunning ||
                      hasResults
                    }
                    value={ctx.selectedPromptSet}
                    onChange={ctx.setSelectedPromptSet}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Option 2: Select Existing Prompt Set */}
          <div
            className={`border-2 rounded-lg p-6 transition-all duration-200 cursor-pointer ${
              ctx.promptsSource === "existing"
                ? "border-green-500 bg-green-50"
                : ctx.promptsSource === "file"
                  ? "border-gray-200 bg-gray-50 hover:border-gray-300"
                  : "border-gray-200 hover:border-gray-300"
            } ${ctx.isRunning || ctx.isUploading || hasResults ? "pointer-events-none opacity-50" : ""}`}
            onClick={handleUseExistingPromptsOptionClicked}
          >
            <div className="flex items-start space-x-3 mb-4">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  ctx.promptsSource === "existing"
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                B
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-700">
                    Use Existing Prompts
                  </h3>
                  {ctx.promptsSource === "file" && (
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                      Click to switch
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  Select from benchmarks already available in the system
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choose Benchmark
              </label>
              <PromptSetSelect
                ref={ctx.existingPromptSetSelectHandler}
                onChange={handleExistingPromptSetSelect}
                disabled={
                  ctx.isRunning ||
                  ctx.isUploading ||
                  ctx.isLoadingPrompts ||
                  hasResults
                }
                id="prompt-set-select"
                placeholder="Select a benchmark..."
                accessReason={PromptSetAccessReasons.runBenchmark}
                urlParamName="promptSetId"
              />
            </div>
          </div>
        </div>

        {/* Prompt Preview Section */}
        {(ctx.totalPromptsCount > 0 || ctx.isLoadingPrompts) &&
          ctx.isUploadedFileFollowsStandardFormat && (
            <div className="flex flex-col gap-3">
              {ctx.isLoadingPrompts && (
                <div className="flex justify-end">
                  <Button
                    variant="destructive"
                    onClick={handlePromptSetLoadingAbortClick}
                  >
                    Cancel
                  </Button>
                </div>
              )}
              <PromptsPreview
                prompts={ctx.samplePrompts}
                totalPrompts={ctx.totalPromptsCount}
                showCorrectAnswer={true}
                isLoading={ctx.isLoadingPrompts}
              />
            </div>
          )}
      </div>
    </div>
  );
}
