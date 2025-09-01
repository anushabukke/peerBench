import { PromptResponse } from "../../src/types";
import { mockPrompts } from "./prompts";

export const mockResponses: PromptResponse[] = [
  {
    provider: "openrouter",
    modelId: "anthropic/claude-3-5-sonnet",
    modelName: "claude-3-5-sonnet",
    modelOwner: "anthropic",
    modelHost: "openrouter",
    taskId: "task:018e1234-5678-9abc-def0-123456789f67",
    prompt: mockPrompts[0],
    cid: "bafybeihq6m6s65kjpqqja7rq4b2zm5cmlwxv2f3w7qzcefohupcccfaz4i",
    sha256: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
    data: "A",
    startedAt: 1704067200000, // January 1, 2024
    finishedAt: 1704067205000, // 5 seconds later
    runId: "018e1234-5678-9abc-def0-123456789fef",
    sourceTaskFile: {
      cid: "bafybeihq6m6s65kjpqqja7rq4b2zm5cmlwxv2f3w7qzcefohupcccfaz4i",
      sha256:
        "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
      fileName: "geography-quiz.json",
    },
  },
  {
    provider: "nearai",
    modelId: "llama-3.1-8b-instruct",
    modelName: "llama-3.1-8b-instruct",
    modelOwner: "meta",
    modelHost: "nearai",
    taskId: "task:018e1234-5678-9abc-def0-123456789f89",
    prompt: mockPrompts[1],
    cid: "bafybeihq6m6s65kjpqqja7rq4b2zm5cmlwxv2f3w7qzcefohupcccfaz4i",
    sha256: "c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4",
    data: "D",
    startedAt: 1704067200000,
    finishedAt: 1704067203000, // 3 seconds later
    runId: "018e1234-5678-9abc-def0-123456789f11",
    sourceTaskFile: {
      cid: "bafybeihq6m6s65kjpqqja7rq4b2zm5cmlwxv2f3w7qzcefohupcccfaz4i",
      sha256:
        "c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4",
      fileName: "astronomy-quiz.json",
    },
  },
  {
    provider: "openrouter",
    modelId: "openai/gpt-4o",
    modelName: "gpt-4o",
    modelOwner: "openai",
    modelHost: "openrouter",
    taskId: "task:018e1234-5678-9abc-def0-123456789fab",
    prompt: mockPrompts[2],
    cid: "bafybeihq6m6s65kjpqqja7rq4b2zm5cmlwxv2f3w7qzcefohupcccfaz4i",
    sha256: "e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6",
    data: "The child was joyful to see the puppy.",
    startedAt: 1704067200000,
    finishedAt: 1704067204000, // 4 seconds later
    runId: "018e1234-5678-9abc-def0-123456789f33",
    sourceTaskFile: {
      cid: "bafybeihq6m6s65kjpqqja7rq4b2zm5cmlwxv2f3w7qzcefohupcccfaz4i",
      sha256:
        "e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6",
      fileName: "language-exercises.json",
    },
  },
  {
    provider: "nearai",
    modelId: "mistral-7b-instruct",
    modelName: "mistral-7b-instruct",
    modelOwner: "mistral",
    modelHost: "nearai",
    taskId: "task:018e1234-5678-9abc-def0-123456789fcd",
    prompt: mockPrompts[3],
    cid: "bafybeihq6m6s65kjpqqja7rq4b2zm5cmlwxv2f3w7qzcefohupcccfaz4i",
    sha256: "a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8",
    data: "B",
    startedAt: 1704067200000,
    finishedAt: 1704067202000, // 2 seconds later
    runId: "018e1234-5678-9abc-def0-123456789f77",
    sourceTaskFile: {
      cid: "bafybeihq6m6s65kjpqqja7rq4b2zm5cmlwxv2f3w7qzcefohupcccfaz4i",
      sha256:
        "a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8",
      fileName: "chemistry-quiz.json",
    },
  },
  {
    provider: "openrouter",
    modelId: "anthropic/claude-3-haiku",
    modelName: "claude-3-haiku",
    modelOwner: "anthropic",
    modelHost: "openrouter",
    taskId: "task:018e1234-5678-9abc-def0-123456789fab",
    prompt: mockPrompts[4],
    cid: "bafybeihq6m6s65kjpqqja7rq4b2zm5cmlwxv2f3w7qzcefohupcccfaz4i",
    sha256: "c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0",
    data: "The weather is beautiful today.",
    startedAt: 1704067200000,
    finishedAt: 1704067206000, // 6 seconds later
    runId: "018e1234-5678-9abc-def0-123456789f55",
    sourceTaskFile: {
      cid: "bafybeihq6m6s65kjpqqja7rq4b2zm5cmlwxv2f3w7qzcefohupcccfaz4i",
      sha256:
        "c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0",
      fileName: "language-exercises.json",
    },
  },
];
