"use client";
import {
  PromptSetSelectHandler,
  PromptSetSelectOption,
} from "@/components/prompt-set-select";
import { uploadAction } from "@/lib/actions/upload";
import { QK_PROMPT_SETS, QK_PROMPTS } from "@/lib/react-query/query-keys";
import {
  calculateCID,
  calculateSHA256,
  DataParser,
  PBParser,
  Prompt,
  PromptResponse,
  PromptScore,
  stableStringify,
} from "@peerbench/sdk";
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  ReactNode,
  Dispatch,
  SetStateAction,
  useState,
  useRef,
} from "react";

export type UploadType = "data" | "hashes";
export type EntitiesToBeUploaded = "prompts" | "responses" | "scores";

export type PageContextType = {
  prompts: Prompt[];
  setPrompts: Dispatch<SetStateAction<Prompt[]>>;

  responses: PromptResponse[];
  setResponses: Dispatch<SetStateAction<PromptResponse[]>>;

  scores: PromptScore[];
  setScores: Dispatch<SetStateAction<PromptScore[]>>;

  uploadedFileName: string | null;
  setUploadedFileName: Dispatch<SetStateAction<string | null>>;

  isUploadedFileFollowsStandardFormat: boolean;
  setIsUploadedFileFollowsStandardFormat: Dispatch<SetStateAction<boolean>>;

  isParsing: boolean;
  setIsParsing: Dispatch<SetStateAction<boolean>>;

  isUploading: boolean;
  setIsUploading: Dispatch<SetStateAction<boolean>>;

  totalPromptsCount: number;
  setTotalPromptsCount: Dispatch<SetStateAction<number>>;

  samplePrompts: Prompt[];
  setSamplePrompts: Dispatch<SetStateAction<Prompt[]>>;

  selectedPromptSet: PromptSetSelectOption | null;
  setSelectedPromptSet: Dispatch<SetStateAction<PromptSetSelectOption | null>>;

  uploadType: UploadType;
  setUploadType: Dispatch<SetStateAction<UploadType>>;

  entitiesToBeUploaded: EntitiesToBeUploaded[];
  setEntitiesToBeUploaded: Dispatch<SetStateAction<EntitiesToBeUploaded[]>>;

  promptSelectHandler: React.RefObject<PromptSetSelectHandler | null>;

  clear: () => void;
  uploadFile: (file: File) => Promise<boolean>;
  uploadData: () => Promise<void>;
};

export function PageContextProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [responses, setResponses] = useState<PromptResponse[]>([]);
  const [scores, setScores] = useState<PromptScore[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [
    isUploadedFileFollowsStandardFormat,
    setIsUploadedFileFollowsStandardFormat,
  ] = useState(true);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [totalPromptsCount, setTotalPromptsCount] = useState(0);
  const [samplePrompts, setSamplePrompts] = useState<Prompt[]>([]);
  const [selectedPromptSet, setSelectedPromptSet] =
    useState<PromptSetSelectOption | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadType, setUploadType] = useState<UploadType>("data");
  const promptSelectHandler = useRef<PromptSetSelectHandler>(null);
  const [entitiesToBeUploaded, setEntitiesToBeUploaded] = useState<
    EntitiesToBeUploaded[]
  >([]);

  return (
    <PageContext.Provider
      value={{
        isParsing,
        setIsParsing,

        isUploadedFileFollowsStandardFormat,
        setIsUploadedFileFollowsStandardFormat,

        uploadedFileName,
        setUploadedFileName,

        prompts,
        setPrompts,

        responses,
        setResponses,

        scores,
        setScores,

        totalPromptsCount,
        setTotalPromptsCount,

        samplePrompts,
        setSamplePrompts,

        selectedPromptSet,
        setSelectedPromptSet,

        isUploading,
        setIsUploading,

        uploadType,
        setUploadType,

        entitiesToBeUploaded,
        setEntitiesToBeUploaded,

        promptSelectHandler,

        clear: () => {
          setPrompts([]);
          setResponses([]);
          setScores([]);
          setSamplePrompts([]);
          setUploadedFileName(null);
          setTotalPromptsCount(0);
          setIsUploadedFileFollowsStandardFormat(true);
          setIsParsing(false);
          setIsUploading(false);
          setEntitiesToBeUploaded([]);
        },

        uploadFile: async (file: File) => {
          setIsParsing(true);
          setTotalPromptsCount(0);

          try {
            const content = new Uint8Array(await file.arrayBuffer());
            const { result, parser } = await DataParser.parseContent(content);

            setUploadedFileName(file.name);
            setResponses(result.responses);
            setScores(result.scores);

            setPrompts(result.prompts);
            setTotalPromptsCount(result.prompts.length);
            setSamplePrompts(result.prompts.slice(0, 5));

            // Auto-select all entities that have data
            const entitiesToSelect: EntitiesToBeUploaded[] = [];
            if (result.prompts.length > 0) {
              entitiesToSelect.push("prompts");
            }
            if (result.responses.length > 0) {
              entitiesToSelect.push("responses");
            }
            if (result.scores.length > 0) {
              entitiesToSelect.push("scores");
            }
            setEntitiesToBeUploaded(entitiesToSelect);

            // Check if the file follows standard PeerBench format
            if (parser.getIdentifier() !== PBParser.identifier) {
              setIsUploadedFileFollowsStandardFormat(false);
              return false;
            }

            return true;
          } catch (err) {
            setUploadedFileName(null);
            setPrompts([]);
            setResponses([]);
            setScores([]);
            setTotalPromptsCount(0);
            setSamplePrompts([]);
            throw err;
          } finally {
            setIsParsing(false);
          }
        },

        uploadData: async () => {
          try {
            setIsUploading(true);
            const hashes = [];
            if (uploadType === "hashes") {
              if (entitiesToBeUploaded.includes("prompts")) {
                hashes.push(...(await hashObjectArray(prompts)));
              }
              if (entitiesToBeUploaded.includes("responses")) {
                hashes.push(...(await hashObjectArray(responses)));
              }
              if (entitiesToBeUploaded.includes("scores")) {
                hashes.push(...(await hashObjectArray(scores)));
              }
            }

            const result = await uploadAction({
              promptSetId:
                uploadType === "data" ? selectedPromptSet!.id! : undefined,
              prompts:
                entitiesToBeUploaded.includes("prompts") &&
                uploadType === "data" &&
                prompts.length > 0
                  ? prompts.map((p) => ({
                      ...p,
                      // TODO: Add signature fields
                    }))
                  : undefined,
              responses:
                entitiesToBeUploaded.includes("responses") &&
                uploadType === "data" &&
                responses.length > 0
                  ? responses.map((r) => ({
                      ...r,
                      // TODO: Add signature fields
                    }))
                  : undefined,
              scores:
                entitiesToBeUploaded.includes("scores") &&
                uploadType === "data" &&
                scores.length > 0
                  ? await Promise.all(
                      scores.map(async (s) => {
                        // We expect that the parser has parsed the Response and Prompts
                        // separately and we are looking for the ones that are related to this Score.
                        const response = responses.find((r) => r.did === s.did);
                        if (!response) {
                          throw new Error(
                            `Response data not found for Score ${s.did}`
                          );
                        }

                        const prompt = prompts.find(
                          (p) => p.did === s.prompt?.did
                        );
                        if (!prompt) {
                          throw new Error(
                            `Prompt data not found for Score ${s.did}`
                          );
                        }

                        const {
                          sha256: promptHashSha256Registration,
                          cid: promptHashCIDRegistration,
                        } = await hashObject(prompt);

                        const {
                          sha256: responseHashSha256Registration,
                          cid: responseHashCIDRegistration,
                        } = await hashObject(response);

                        return {
                          ...s,
                          responseHashSha256Registration,
                          responseHashCIDRegistration,
                          promptHashSha256Registration,
                          promptHashCIDRegistration,
                          // TODO: Add signature fields
                        };
                      })
                    )
                  : undefined,

              hashes: uploadType === "hashes" ? hashes : undefined,
            });

            if (result?.error) {
              throw new Error(result.error);
            }

            if (uploadType === "data") {
              // Invalidate query caches
              queryClient.invalidateQueries({
                predicate: (query) =>
                  // Prompt Set lists query
                  query.queryKey[0] === QK_PROMPT_SETS ||
                  // Prompts query
                  query.queryKey[0] === QK_PROMPTS,
              });

              // Update the selected Prompt Set since revalidating the query
              // won't update the local state of this component.
              setSelectedPromptSet((prev) => ({
                ...prev!,
                totalPromptsCount: entitiesToBeUploaded.includes("prompts")
                  ? (prev!.totalPromptsCount ?? 0) + prompts.length
                  : 0,
              }));
            }
          } finally {
            setIsUploading(false);
          }
        },
      }}
    >
      {children}
    </PageContext.Provider>
  );
}

const hashObjectArray = async (
  objs: Prompt[] | PromptResponse[] | PromptScore[]
) => {
  return await Promise.all(
    objs.map((obj) => {
      return new Promise<Awaited<ReturnType<typeof hashObject>>>((res) => {
        // Hash each object in idle time so the UI won't freeze
        requestIdleCallback(async () => {
          const hashInfo = await hashObject(obj);
          res(hashInfo);
        });
      });
    })
  );
};

const hashObject = async (obj: Prompt | PromptResponse | PromptScore) => {
  const stringified = stableStringify(obj)!;
  const cid = await calculateCID(stringified).then((c) => c.toString());
  const sha256 = await calculateSHA256(stringified);

  return {
    cid,
    sha256,
  };
};

export const PageContext = createContext<PageContextType | null>(null);

export function usePageContext() {
  const context = useContext(PageContext);
  if (!context) {
    throw new Error("usePageContext must be used inside PageContextProvider");
  }
  return context;
}
