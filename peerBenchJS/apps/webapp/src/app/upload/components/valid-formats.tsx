"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LucideChevronRight, LucideExternalLink } from "lucide-react";
import { cn } from "@/utils/cn";

export function ValidFormats() {
  const [openModal, setOpenModal] = useState<string | null>(null);

  return (
    <>
      <div className="mb-4 space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Your file must be in one of the following formats:
        </p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(formats).map(
            ([key, schema]: [string, FormatInfo]) => (
              <Button
                type="button"
                variant="outline"
                key={key}
                onClick={() => setOpenModal(key)}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left"
              >
                {schema.title}
                <LucideChevronRight />
              </Button>
            )
          )}
        </div>
      </div>

      {Object.entries(formats).map(([key, schema]: [string, FormatInfo]) => (
        <Dialog
          key={key}
          open={openModal === key}
          onOpenChange={(open) => setOpenModal(open ? key : null)}
        >
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>
                <a
                  href={schema.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex gap-2",
                    schema.href && "text-blue-500 dark:text-blue-300 underline"
                  )}
                >
                  {schema.title}
                  {schema.href && <LucideExternalLink size={12} />}
                </a>
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto">
              <pre className="text-sm overflow-x-auto p-4 bg-gray-100 dark:bg-gray-800 rounded whitespace-pre-wrap">
                {schema.example}
              </pre>
            </div>
          </DialogContent>
        </Dialog>
      ))}
    </>
  );
}

type FormatInfo = {
  title: React.ReactNode;
  example: string;
  href?: string;
};

const formats: Record<string, FormatInfo> = {
  medqa: {
    href: "https://paperswithcode.com/dataset/medqa-usmle",
    title: "MedQA",
    example: `[
  {
    "question": "What is the most common cause of acute viral hepatitis worldwide?",
    "options": {
      "A": "Hepatitis A virus",
      "B": "Hepatitis B virus",
      "C": "Hepatitis C virus",
      "D": "Hepatitis E virus"
    },
    "answer": "Hepatitis A virus",
    "answer_idx": "A",
    "meta_info": "Gastroenterology"
  }
  ...
]`,
  },
  "mmlu-pro": {
    href: "https://huggingface.co/datasets/TIGER-Lab/MMLU-Pro",
    title: "MMLU-Pro",
    example: `[
  {
    "question_id": 12345,
    "question": "A 45-year-old patient presents with...",
    "options": [
      "Option A",
      "Option B",
      "Option C",
      "Option D"
    ],
    "answer": "Option A",
    "answer_index": 0,
    "cot_content": "Let's analyze this step by step...",
    "category": "Clinical Medicine",
    "src": "USMLE Step 2 CK"
  }
  ...
]`,
  },
  pb: {
    title: "peerBench",
    example: `[
  {
    "did": "019a0d26-d173-7a61-a17d-7d89bf90c486",
    "question": {
      "data": "What is life?",
      "cid": "bagaaiera67eis6d2j5pbtwfldxjo7g6tt4k2miq7rtj6xqn5nph3ysnbm5aa",
      "sha256": "d90c38d93eb101437e9e23ae36d9965148272e826c0ddace2c973d6b2bfe954b"
    },
    "answer": "Life is a mystery",
    "answerKey": "A",
    "options": {
      "A": "Life is a mystery",
      "B": "Life is a game",
      "C": "Life is a challenge",
      "D": "Life is a opportunity",
      "E": "Life is a gift",
      "F": "Life is a curse",
      "G": "Life is a burden",
      "H": "Life is a opportunity"
    },
    "fullPrompt": {
      "data": "What is life?",
      "cid": "bagaaieratdlo5j3cbuimqvxkgmtyfs7kajnbueo5fhjppzocwvjmubasorbq",
      "sha256": "2d2bf2aa0816bfd669aa0f2b5570d4b8554ffae6a98be4b0e7933844332500a1"
    },
    "type": "multiple-choice",
    "metadata": {
      "uploaded-by-user-id": "1234567890",
    },
    "scorers": [
      "multiple-choice",
      "ref-answer-equality-llm-judge-scorer"
    ]
  }
]`,
  },
};
