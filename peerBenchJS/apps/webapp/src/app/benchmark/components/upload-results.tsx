import { useState } from "react";
import { usePageContext, BenchmarkScoringMethods } from "../context";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "react-toastify";
import { calculateCID, calculateSHA256, Prompt } from "@peerbench/sdk";
import { errorMessage } from "@/utils/error-message";
import {
  LucideLoader2,
  LucideUpload,
  LucideHash,
  LucideDownload,
  LucideShield,
} from "lucide-react";
import JSZip from "jszip";
import { stableStringify } from "@/lib/stable-stringify";
import type { RequestBodyType as PostScoresRequestBodyType } from "@/app/api/v2/scores/post";
import { useQueryClient } from "@tanstack/react-query";
import { QK_PROMPT_SETS, QK_PROMPTS } from "@/lib/react-query/query-keys";
import { uploadAction } from "@/lib/actions/upload";

type UploadType = "data" | "hashes" | "hashes-and-scores";

export default function UploadResults() {
  const ctx = usePageContext();
  const queryClient = useQueryClient();

  const [uploadType, setUploadType] = useState<UploadType>("data");
  const [isUploading, setIsUploading] = useState(false);
  const [isFilePreparing, setIsFilePreparing] = useState(false);

  const handleUpload = async () => {
    if (ctx.results.length === 0) {
      toast.error("Nothing to upload");
      return;
    }

    if (ctx.promptsSource === "file" && !ctx.selectedPromptSet) {
      toast.error("Please select a Benchmark for the new Prompts");
      return;
    }

    setIsUploading(true);
    const loadingToast = toast.loading("Uploading...");

    try {
      if (uploadType === "data") {
        await uploadData();

        // Now we have new data on the Prompt Set that's why we need
        // to invalidate the caches so the new data will be fetched.
        await Promise.all([
          queryClient.invalidateQueries({
            predicate: (query) =>
              // Invalidate Prompt Set list queries
              query.queryKey[0] === QK_PROMPT_SETS ||
              // Invalidate Prompt list queries
              query.queryKey[0] === QK_PROMPTS,
          }),
        ]);
      } else if (uploadType === "hashes") {
        await uploadHashes();
      } else {
        await uploadHashesAndScores();
      }

      toast.update(loadingToast, {
        render: "Data uploaded successfully",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
      ctx.setIsResultsUploaded(true);
    } catch (error) {
      console.error(error);
      toast.error(`Upload failed: ${errorMessage(error)}`);
    } finally {
      setIsUploading(false);
    }
  };

  const uploadData = async () => {
    const result = await uploadAction({
      // Upload the Prompts if they were new
      promptSetId: ctx.selectedPromptSet!.id!,
      prompts: ctx.uploadedFileName
        ? ctx.promptsToBeTested.map((prompt) => ({
            ...prompt,
            // TODO: Add signature fields
          }))
        : undefined,

      responses: ctx.results.map((result) => ({
        ...result.response,
        // TODO: Add signature fields
      })),

      // Upload the Scores if user didn't specify opposite
      scores:
        ctx.scoringMethod !== BenchmarkScoringMethods.none
          ? await Promise.all(
              ctx.results
                .filter((r) => r.score !== undefined) // Ignore the ones that are not scored yet
                .map<Promise<PostScoresRequestBodyType["scores"][number]>>(
                  async (r) => {
                    const prompt: Prompt = r.response.prompt;

                    const promptHashSha256Registration = await calculateSHA256(
                      stableStringify(prompt)!
                    );
                    const promptHashCIDRegistration = await calculateCID(
                      stableStringify(prompt)!
                    ).then((c) => c.toString());

                    const responseHashSha256Registration =
                      await calculateSHA256(stableStringify(r.response)!);

                    const responseHashCIDRegistration = await calculateCID(
                      stableStringify(r.response)!
                    ).then((c) => c.toString());

                    return {
                      ...r.score!,

                      responseHashSha256Registration,
                      responseHashCIDRegistration,
                      promptHashSha256Registration,
                      promptHashCIDRegistration,

                      // TODO: Add signature fields
                    };
                  }
                )
            )
          : undefined,
    });

    if (result?.error) {
      throw new Error(result.error);
    }
  };

  const uploadHashes = async () => {
    const hashes = [];

    for (const r of ctx.results) {
      // If the Prompts were new, also upload their hashes
      if (ctx.uploadedFileName) {
        const promptHashSha256Registration = await calculateSHA256(
          stableStringify(r.response.prompt)!
        );
        const promptHashCIDRegistration = await calculateCID(
          stableStringify(r.response.prompt)!
        ).then((c) => c.toString());

        // Add Prompt hash
        hashes.push({
          cid: promptHashCIDRegistration,
          sha256: promptHashSha256Registration,
          // TODO: Add signature fields
        });
      }

      // Calculate hashes for response
      const responseHashSha256Registration = await calculateSHA256(
        stableStringify(r.response)!
      );
      const responseHashCIDRegistration = await calculateCID(
        stableStringify(r.response)!
      ).then((c) => c.toString());

      // Add Response hash
      hashes.push({
        cid: responseHashCIDRegistration,
        sha256: responseHashSha256Registration,

        // TODO: Add signature fields
      });

      const scoreObject = {
        ...r.score!,

        // Don't include Prompt info within the Score object
        // since this is the hash upload
        prompt: undefined,
      };
      const scoreHashSha256Registration = await calculateSHA256(
        stableStringify(scoreObject)!
      );
      const scoreHashCIDRegistration = await calculateCID(
        stableStringify(scoreObject)!
      ).then((c) => c.toString());

      // Add Score hash
      hashes.push({
        cid: scoreHashCIDRegistration,
        sha256: scoreHashSha256Registration,

        // TODO: Add signature fields
      });
    }

    const result = await uploadAction({
      hashes: hashes,
    });

    if (result?.error) {
      throw new Error(result.error);
    }
  };

  const uploadHashesAndScores = async () => {
    const hashes = [];

    for (const r of ctx.results) {
      // If the Prompts were new, also upload their hashes
      if (ctx.uploadedFileName) {
        const promptHashSha256Registration = await calculateSHA256(
          stableStringify(r.response.prompt)!
        );
        const promptHashCIDRegistration = await calculateCID(
          stableStringify(r.response.prompt)!
        ).then((c) => c.toString());

        hashes.push({
          cid: promptHashCIDRegistration,
          sha256: promptHashSha256Registration,
          // TODO: Add signature fields
        });
      }

      // Calculate hashes for response
      const responseHashSha256Registration = await calculateSHA256(
        stableStringify(r.response)!
      );
      const responseHashCIDRegistration = await calculateCID(
        stableStringify(r.response)!
      ).then((c) => c.toString());

      hashes.push({
        cid: responseHashCIDRegistration,
        sha256: responseHashSha256Registration,

        // TODO: Add signature fields
      });
    }

    const result = await uploadAction({
      hashes: hashes,
      scores: await Promise.all(
        ctx.results
          .filter((r) => r.score !== undefined) // Ignore the ones that are not scored yet
          .map<Promise<PostScoresRequestBodyType["scores"][number]>>(
            async (r) => {
              const promptHashSha256Registration = await calculateSHA256(
                stableStringify(r.response.prompt)!
              );
              const promptHashCIDRegistration = await calculateCID(
                stableStringify(r.response.prompt)!
              ).then((c) => c.toString());

              const responseHashSha256Registration = await calculateSHA256(
                stableStringify(r.response)!
              );

              const responseHashCIDRegistration = await calculateCID(
                stableStringify(r.response)!
              ).then((c) => c.toString());

              return {
                ...r.score!,

                // Don't include Prompt info within the Score object
                // since this is the hash upload. The score already has the response
                // id which is something that points to the Prompt.
                prompt: undefined,

                responseHashSha256Registration,
                responseHashCIDRegistration,
                promptHashSha256Registration,
                promptHashCIDRegistration,

                // TODO: Add signature fields
              };
            }
          )
      ),
    });

    if (result?.error) {
      throw new Error(result.error);
    }
  };

  const handleDownload = async () => {
    if (ctx.results.length === 0) {
      toast.error("Nothing to download");
      return;
    }

    setIsFilePreparing(true);

    try {
      const responses = ctx.results.map((result) => result.response);
      const scores = ctx.results
        .map((r) => r.score!)
        .filter((r) => r.score !== undefined);

      // Create zip file using JSZip
      const zip = new JSZip();
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

      // Add responses.json to zip
      zip.file("responses.json", JSON.stringify(responses, null, 2));

      // Add scores.json to zip (only if there are scores)
      if (scores.length > 0) {
        zip.file("scores.json", JSON.stringify(scores, null, 2));
      }

      // Generate zip file
      const zipBlob = await zip.generateAsync({ type: "blob" });

      // Download zip file
      const zipUrl = URL.createObjectURL(zipBlob);
      const zipLink = document.createElement("a");
      zipLink.href = zipUrl;
      zipLink.download = `results-${timestamp}.zip`;
      document.body.appendChild(zipLink);
      zipLink.click();
      document.body.removeChild(zipLink);
      URL.revokeObjectURL(zipUrl);
    } catch (error) {
      console.error(error);
      toast.error(`Download failed: ${errorMessage(error)}`);
    } finally {
      setIsFilePreparing(false);
    }
  };

  if (ctx.results.length === 0 || ctx.isRunning) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div
          className={`space-y-3 ${isFilePreparing ? "opacity-50 pointer-events-none" : ""}`}
        >
          <RadioGroup
            value={uploadType}
            onValueChange={(value) => setUploadType(value as UploadType)}
            className="space-y-3"
            disabled={isFilePreparing}
          >
            <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <RadioGroupItem value="data" id="data" />
              <Label htmlFor="data" className="flex-1 cursor-pointer">
                <div className="flex items-center space-x-2">
                  <LucideUpload className="w-4 h-4 text-blue-500" />
                  <div>
                    <div className="font-medium text-gray-900">Full Data</div>
                    <div className="text-sm text-gray-500">
                      Upload full data of Prompts (new ones), Responses{" "}
                      {ctx.scoringMethod !== BenchmarkScoringMethods.none
                        ? "and Scores"
                        : ""}
                    </div>
                  </div>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <RadioGroupItem value="hashes" id="hashes" />
              <Label htmlFor="hashes" className="flex-1 cursor-pointer">
                <div className="flex items-center space-x-2">
                  <LucideHash className="w-4 h-4 text-green-500" />
                  <div>
                    <div className="font-medium text-gray-900">Hash Only</div>
                    <div className="text-sm text-gray-500">
                      Upload only the hash of Prompts (new ones), Responses{" "}
                      {ctx.scoringMethod !== BenchmarkScoringMethods.none
                        ? "and Scores "
                        : " "}
                      without revealing them. In this case you&apos;ll download
                      the result data to reveal them later.
                    </div>
                  </div>
                </div>
              </Label>
            </div>

            {ctx.scoringMethod !== BenchmarkScoringMethods.none && (
              <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <RadioGroupItem
                  value="hashes-and-scores"
                  id="hashes-and-scores"
                />
                <Label
                  htmlFor="hashes-and-scores"
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <LucideShield className="w-4 h-4 text-orange-500" />
                    <div>
                      <div className="font-medium text-gray-900">
                        Hashes + Scores
                      </div>
                      <div className="text-sm text-gray-500">
                        Upload hashes of Prompts and Responses without revealing
                        them, but upload full Scores data. This allows for
                        verification while keeping prompts and responses
                        private.
                      </div>
                    </div>
                  </div>
                </Label>
              </div>
            )}
          </RadioGroup>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            onClick={handleDownload}
            disabled={isFilePreparing || ctx.results.length === 0}
            variant="outline"
            className="min-w-[140px]"
          >
            {isFilePreparing ? (
              <>
                <LucideLoader2 className="w-4 h-4 mr-2 animate-spin" />
                Preparing...
              </>
            ) : (
              <>
                <LucideDownload className="w-4 h-4 mr-2" />
                Download Data
              </>
            )}
          </Button>

          <Button
            onClick={handleUpload}
            disabled={
              isUploading ||
              isFilePreparing ||
              ctx.isUploading ||
              ctx.isResultsUploaded ||
              (ctx.promptsSource === "file" && !ctx.selectedPromptSet) ||
              (ctx.scoringMethod === "human" && !ctx.areAllResponsesScored)
            }
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
          >
            {isUploading ? (
              <>
                <LucideLoader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : ctx.isResultsUploaded ? (
              "Uploaded"
            ) : (
              <>
                <LucideUpload className="w-4 h-4 mr-2" />
                Upload
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
