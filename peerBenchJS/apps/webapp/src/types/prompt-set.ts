export const PromptSetAccessReasons = {
  review: "review",
  submitPrompt: "submit-prompt",
  edit: "edit",
  runBenchmark: "run-benchmark",
} as const;

export type PromptSetAccessReason =
  (typeof PromptSetAccessReasons)[keyof typeof PromptSetAccessReasons];
