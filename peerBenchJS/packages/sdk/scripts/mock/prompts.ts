import { Prompt, PromptTypes } from "../../src/types";

export const mockPrompts: Prompt[] = [
  {
    did: "018e1234-5678-9abc-def0-123456789abc",
    question: {
      data: "What is the capital of France?",
      cid: "bafybeihq6m6s65kjpqqja7rq4b2zm5cmlwxv2f3w7qzcefohupcccfaz4i",
      sha256:
        "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
    },
    options: {
      A: "London",
      B: "Berlin",
      C: "Paris",
      D: "Madrid",
    },
    fullPrompt: {
      data: "Question: What is the capital of France?\n\nOptions:\nA) London\nB) Berlin\nC) Paris\nD) Madrid\n\nPlease select the correct answer.",
      cid: "bafybeihq6m6s65kjpqqja7rq4b2zm5cmlwxv2f3w7qzcefohupcccfaz4i",
      sha256:
        "b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3",
    },
    type: PromptTypes.MultipleChoice,
    answer: "Paris",
    answerKey: "C",
    metadata: {
      category: "geography",
      difficulty: "easy",
    },
  },
  {
    did: "018e1234-5678-9abc-def0-123456789def",
    question: {
      data: "Which planet is known as the Red Planet?",
      cid: "bafybeihq6m6s65kjpqqja7rq4b2zm5cmlwxv2f3w7qzcefohupcccfaz4i",
      sha256:
        "c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4",
    },
    options: {
      A: "Venus",
      B: "Mars",
      C: "Jupiter",
      D: "Saturn",
    },
    fullPrompt: {
      data: "Question: Which planet is known as the Red Planet?\n\nOptions:\nA) Venus\nB) Mars\nC) Jupiter\nD) Saturn\n\nPlease select the correct answer.",
      cid: "bafybeihq6m6s65kjpqqja7rq4b2zm5cmlwxv2f3w7qzcefohupcccfaz4i",
      sha256:
        "d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5",
    },
    type: PromptTypes.MultipleChoice,
    answer: "Mars",
    answerKey: "B",
    metadata: {
      category: "astronomy",
      difficulty: "medium",
    },
  },
  {
    did: "018e1234-5678-9abc-def0-123456789f01",
    question: {
      data: "Replace the word 'happy' with a synonym in the sentence: 'The child was happy to see the puppy.'",
      cid: "bafybeihq6m6s65kjpqqja7rq4b2zm5cmlwxv2f3w7qzcefohupcccfaz4i",
      sha256:
        "e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6",
    },
    options: {},
    fullPrompt: {
      data: "Replace the word 'happy' with a synonym in the sentence: 'The child was happy to see the puppy.'\n\nPlease provide the complete sentence with the replacement.",
      cid: "bafybeihq6m6s65kjpqqja7rq4b2zm5cmlwxv2f3w7qzcefohupcccfaz4i",
      sha256:
        "f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7",
    },
    type: PromptTypes.TextReplacement,
    answer: "The child was joyful to see the puppy.",
    answerKey: "",
    metadata: {
      category: "language",
      difficulty: "easy",
    },
  },
  {
    did: "018e1234-5678-9abc-def0-123456789f23",
    question: {
      data: "What is the chemical symbol for gold?",
      cid: "bafybeihq6m6s65kjpqqja7rq4b2zm5cmlwxv2f3w7qzcefohupcccfaz4i",
      sha256:
        "a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8",
    },
    options: {
      A: "Ag",
      B: "Au",
      C: "Fe",
      D: "Cu",
    },
    fullPrompt: {
      data: "Question: What is the chemical symbol for gold?\n\nOptions:\nA) Ag\nB) Au\nC) Fe\nD) Cu\n\nPlease select the correct answer.",
      cid: "bafybeihq6m6s65kjpqqja7rq4b2zm5cmlwxv2f3w7qzcefohupcccfaz4i",
      sha256:
        "b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9",
    },
    type: PromptTypes.MultipleChoice,
    answer: "Au",
    answerKey: "B",
    metadata: {
      category: "chemistry",
      difficulty: "medium",
    },
  },
  {
    did: "018e1234-5678-9abc-def0-123456789f45",
    question: {
      data: "Correct the spelling error in: 'The weather is beautifull today.'",
      cid: "bafybeihq6m6s65kjpqqja7rq4b2zm5cmlwxv2f3w7qzcefohupcccfaz4i",
      sha256:
        "c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0",
    },
    options: {},
    fullPrompt: {
      data: "Correct the spelling error in: 'The weather is beautifull today.'\n\nPlease provide the corrected sentence.",
      cid: "bafybeihq6m6s65kjpqqja7rq4b2zm5cmlwxv2f3w7qzcefohupcccfaz4i",
      sha256:
        "d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1",
    },
    type: PromptTypes.Typo,
    answer: "The weather is beautiful today.",
    answerKey: "",
    metadata: {
      category: "language",
      difficulty: "easy",
    },
  },
];
