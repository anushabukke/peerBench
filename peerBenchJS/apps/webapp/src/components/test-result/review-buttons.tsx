"use client";

import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { cn } from "@/utils/cn";

export interface ReviewButtonsProps {
  onClick: (e: React.MouseEvent) => void;
  className?: string;
  type?: "text" | "icon" | "textAndIcon";
}

export function ReviewButtons({
  onClick,
  className = "",
  type = "icon",
}: ReviewButtonsProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClick}
        className={cn(
          "p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
        )}
        title="Review this"
      >
        {type === "text" ? (
          `Review`
        ) : type === "textAndIcon" ? (
          <>
            Review
            <MessageSquare />
          </>
        ) : (
          <MessageSquare />
        )}
      </Button>
    </div>
  );
}
