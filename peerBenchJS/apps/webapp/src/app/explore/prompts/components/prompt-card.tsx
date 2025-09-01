"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import Link from "next/link";

export interface PromptCardProps {
  id: string;
  href: string;
  promptSet: {
    id: number;
    title: string;
  };
  fullPrompt?: string;
  tags?: string[];
  testResults?: { modelName: string; score: number }[];
  className?: string;
}

export function PromptCard({
  id,
  fullPrompt,
  promptSet,
  tags = [],
  testResults = [],
  className,
}: PromptCardProps) {
  const [copied, setCopied] = useState(false);
  console.log(testResults);
  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy ID:", err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <Card
        className={cn(
          "w-full border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200",
          className
        )}
      >
        <div className="p-4 flex flex-col w-full space-y-4">
          <div className="flex justify-between w-full">
            <h3 className="text-xs text-gray-500">
              {promptSet.title} (ID: {promptSet.id})
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyId}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                title="Copy ID to clipboard"
              >
                ID: <span className="font-mono">{id}</span>
                {copied ? (
                  <Check className="w-3 h-3 text-green-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>

          <div className="w-full overflow-hidden line-clamp-2 text-sm">
            {fullPrompt}
          </div>

          <div className="flex justify-between">
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="flex-1" />
            )}

            <Link
              href={`/explore/prompts/${id}`}
              className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 px-2 py-1 rounded-md transition-all duration-200 font-medium"
              title="View prompt details"
            >
              <ExternalLink className="w-3 h-3" />
              Details
            </Link>
          </div>

          {/* Tested By Section */}
          {testResults.length > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">
                  Tested on:
                </span>
                <div className="flex flex-wrap gap-1">
                  {testResults.slice(0, 3).map((tr, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tr.modelName}
                    </Badge>
                  ))}
                  {testResults.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{testResults.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
