"use client";

import { motion } from "motion/react";
import { ValidFormats } from "./components/valid-formats";
import { Button } from "@/components/ui/button";
import { FileInput } from "@/components/ui/file-input";
import { toast } from "react-toastify";
import { errorMessage } from "@/utils/error-message";
import { Upload, Download } from "lucide-react";
import { PromptSetAccessReasons } from "@/types/prompt-set";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadType, usePageContext, EntitiesToBeUploaded } from "./context";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import PromptsPreview from "@/components/prompts-preview";
import ResponsesPreview from "@/components/responses-preview";
import ScoresPreview from "@/components/scores-preview";
import PromptSetSelect from "@/components/prompt-set-select";

export default function UploadPage() {
  const ctx = usePageContext();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    const infoToast = toast.info("Parsing file...", {
      autoClose: false,
      isLoading: true,
    });

    ctx
      .uploadFile(selectedFile)
      .then((isStdFormat) => {
        if (!isStdFormat) {
          toast.update(infoToast, {
            isLoading: false,
            type: "warning",
            render:
              "Your task file doesn't follow standard peerBench format. Please use the 'Convert to peerBench Format' button to convert it. Then use the converted file for uploading.",
            autoClose: 5000,
          });
        } else {
          toast.update(infoToast, {
            isLoading: false,
            type: "success",
            render: "File parsed successfully!",
            autoClose: 5000,
          });
        }
      })
      .catch((err) => {
        console.error(err);
        toast.update(infoToast, {
          isLoading: false,
          type: "error",
          render: errorMessage(err),
          autoClose: 5000,
        });
      })
      .finally(() => {
        // Reset the file input since we store file data in another state.
        e.target.value = "";
      });
  };

  const handleConvertToPB = async () => {
    try {
      if (!ctx.uploadedFileName) {
        throw new Error("No file selected");
      }

      const blob = new Blob(
        [JSON.stringify([...ctx.prompts, ...ctx.responses, ...ctx.scores])],
        { type: "application/json" }
      );
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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !ctx.uploadedFileName ||
      (ctx.prompts.length === 0 &&
        ctx.responses.length === 0 &&
        ctx.scores.length === 0)
    ) {
      toast.error("Please select a valid file");
      return;
    }

    if (!ctx.selectedPromptSet && ctx.uploadType === "data") {
      toast.error("Please select a Benchmark");
      return;
    }

    if (!ctx.isUploadedFileFollowsStandardFormat) {
      toast.error(
        "Please convert your file doesn't follow standard peerBench format"
      );
      return;
    }

    if (ctx.entitiesToBeUploaded.length === 0) {
      toast.error("Please select at least one entity to upload");
      return;
    }

    const infoToast = toast.loading("Uploading...");
    ctx
      .uploadData()
      .then(() => {
        toast.update(infoToast, {
          render: "Upload successful!",
          type: "success",
          isLoading: false,
          autoClose: 5000,
        });
        ctx.clear();
      })
      .catch((err) => {
        console.error(err);
        toast.update(infoToast, {
          render: `Upload failed: ${errorMessage(err)}`,
          type: "error",
          isLoading: false,
          autoClose: 5000,
        });
      });
  };

  const onTabChange = (value: string) => {
    ctx.setUploadType(value as UploadType);
  };

  const handleEntityToggle = (
    entity: EntitiesToBeUploaded,
    checked: boolean
  ) => {
    if (checked) {
      ctx.setEntitiesToBeUploaded((prev) => {
        if (!prev.includes(entity)) {
          return [...prev, entity];
        }
        return prev;
      });
    } else {
      ctx.setEntitiesToBeUploaded((prev) => prev.filter((e) => e !== entity));
    }
  };

  return (
    <main className="min-h-(--main-viewport-height) flex flex-col items-center justify-center py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl"
      >
        <div className="bg-card rounded-2xl shadow-xl overflow-hidden border border-border">
          <div className="bg-primary p-6 text-center">
            <h1 className="text-2xl font-bold text-primary-foreground">
              Upload
            </h1>
            <p className="text-primary-foreground/80 mt-2">
              Upload your existing data to peerBench
            </p>
          </div>
          <div className="p-8">
            <form onSubmit={onSubmit} className="space-y-6">
              <Tabs
                onValueChange={onTabChange}
                defaultValue="data"
                className="w-full"
              >
                <TabsList className="mb-3 w-full flex justify-center">
                  <TabsTrigger value="data">Data</TabsTrigger>
                  <TabsTrigger value="hashes">Hashes</TabsTrigger>
                </TabsList>
                <TabsContent value="data">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Choose a Benchmark
                    </label>
                    <PromptSetSelect
                      id="prompt-set-select"
                      accessReason={PromptSetAccessReasons.submitPrompt}
                      ref={ctx.promptSelectHandler}
                      value={ctx.selectedPromptSet}
                      onChange={ctx.setSelectedPromptSet}
                      disabled={ctx.isUploading || ctx.isParsing}
                      placeholder="Select a Benchmark..."
                      urlParamName="promptSetId"
                    />
                  </div>
                </TabsContent>
                <TabsContent value="hashes">
                  <p className="text-sm text-muted-foreground">
                    Only upload the hash of your data without revealing them
                    yet.
                  </p>
                </TabsContent>
              </Tabs>
              {/* File Upload Section */}
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <Upload className="w-4 h-4" />
                    <div>Upload File</div>
                    {ctx.uploadedFileName && (
                      <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                        {ctx.uploadedFileName}
                      </span>
                    )}
                  </label>
                  <div className="flex flex-col gap-3 items-center">
                    <FileInput
                      accept=".json,.jsonl"
                      onChange={handleFileUpload}
                      disabled={ctx.isUploading || ctx.isParsing}
                      variant="outline"
                      className="w-full"
                      buttonClassName="w-full"
                    />
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
                      disabled={ctx.isUploading || ctx.isParsing}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Convert to PB Format
                    </Button>
                  </div>
                )}

                {/* Entity Selection Checkboxes */}
                {ctx.uploadedFileName &&
                  ctx.isUploadedFileFollowsStandardFormat && (
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Select entities to upload
                      </label>
                      <div className="flex  gap-3">
                        {ctx.prompts.length > 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="entity-prompts"
                                  checked={ctx.entitiesToBeUploaded.includes(
                                    "prompts"
                                  )}
                                  onCheckedChange={(checked) =>
                                    handleEntityToggle(
                                      "prompts",
                                      checked === true
                                    )
                                  }
                                  disabled={ctx.isUploading || ctx.isParsing}
                                />
                                <Label
                                  htmlFor="entity-prompts"
                                  className="text-sm font-normal cursor-pointer"
                                >
                                  Prompts ({ctx.prompts.length})
                                </Label>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                The unique Prompts based on their CID
                                calculated.
                                <br />
                                If you already have those Prompts in your
                                Benchmark, you cannot re-upload them.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {ctx.responses.length > 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="entity-responses"
                                  checked={ctx.entitiesToBeUploaded.includes(
                                    "responses"
                                  )}
                                  onCheckedChange={(checked) =>
                                    handleEntityToggle(
                                      "responses",
                                      checked === true
                                    )
                                  }
                                  disabled={ctx.isUploading || ctx.isParsing}
                                />
                                <Label
                                  htmlFor="entity-responses"
                                  className="text-sm font-normal cursor-pointer"
                                >
                                  Responses ({ctx.responses.length})
                                </Label>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                The unique Responses based on their DID (UUID)
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {ctx.scores.length > 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="entity-scores"
                                  checked={ctx.entitiesToBeUploaded.includes(
                                    "scores"
                                  )}
                                  onCheckedChange={(checked) =>
                                    handleEntityToggle(
                                      "scores",
                                      checked === true
                                    )
                                  }
                                  disabled={ctx.isUploading || ctx.isParsing}
                                />
                                <Label
                                  htmlFor="entity-scores"
                                  className="text-sm font-normal cursor-pointer"
                                >
                                  Scores ({ctx.scores.length})
                                </Label>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>The unique Scores based on their DID (UUID)</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  )}
              </div>

              {/* Valid Schemas Info */}
              {!ctx.uploadedFileName && <ValidFormats />}

              {/* Prompt Preview Section */}
              {ctx.totalPromptsCount > 0 &&
                ctx.isUploadedFileFollowsStandardFormat && (
                  <PromptsPreview
                    prompts={ctx.samplePrompts}
                    allPrompts={ctx.prompts}
                    totalPrompts={ctx.totalPromptsCount}
                    showCorrectAnswer={true}
                    isLoading={false}
                  />
                )}

              {/* Responses Preview Section */}
              {ctx.responses.length > 0 &&
                ctx.isUploadedFileFollowsStandardFormat && (
                  <ResponsesPreview
                    responses={ctx.responses.slice(0, 5)}
                    allResponses={ctx.responses}
                    totalResponses={ctx.responses.length}
                    isLoading={false}
                  />
                )}

              {/* Scores Preview Section */}
              {ctx.scores.length > 0 &&
                ctx.isUploadedFileFollowsStandardFormat && (
                  <ScoresPreview
                    scores={ctx.scores.slice(0, 5)}
                    allScores={ctx.scores}
                    totalScores={ctx.scores.length}
                    isLoading={false}
                  />
                )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={
                  ctx.isUploading ||
                  ctx.isParsing ||
                  !ctx.uploadedFileName ||
                  (ctx.prompts.length === 0 &&
                    ctx.responses.length === 0 &&
                    ctx.scores.length === 0) ||
                  (!ctx.selectedPromptSet && ctx.uploadType === "data") ||
                  !ctx.isUploadedFileFollowsStandardFormat ||
                  ctx.entitiesToBeUploaded.length === 0
                }
                className="w-full"
                size="lg"
              >
                <Upload className="w-4 h-4 mr-2" />
                {ctx.isParsing
                  ? "Parsing..."
                  : ctx.isUploading
                    ? "Uploading..."
                    : "Upload"}
              </Button>
            </form>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
