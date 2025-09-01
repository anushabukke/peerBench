"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { PromptSetListItem as PromptSetListItemType } from "@/services/promptset.service";
import { useState } from "react";
import Link from "next/link";
import { ChevronDown, BookOpen, Users, Calendar, Clock } from "lucide-react";

export function PromptSetListItem({ item }: { item: PromptSetListItemType }) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="group overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-card">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="hover:bg-accent/50 hover:cursor-pointer transition-all duration-300 p-6">
            <div className="flex items-center justify-between w-full">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary text-primary-foreground shadow-lg">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-xl font-bold text-card-foreground">
                    {item.title}
                  </CardTitle>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                  {item.description}
                </p>
                <div className="flex flex-wrap gap-4 text-xs">
                  {item.questionCount !== undefined && (
                    <div className="flex items-center gap-1.5 text-primary">
                      <BookOpen className="w-3 h-3" />
                      <span className="font-medium">
                        {item.questionCount} Questions
                      </span>
                    </div>
                  )}
                  {item.totalAnswers !== undefined && (
                    <div className="flex items-center gap-1.5 text-secondary-foreground">
                      <Users className="w-3 h-3" />
                      <span className="font-medium">
                        {item.totalAnswers} Answers
                      </span>
                    </div>
                  )}
                  {item.createdAt && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span className="font-medium">
                        Created {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {item.updatedAt && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span className="font-medium">
                        Updated {new Date(item.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="ml-4 text-muted-foreground hover:text-primary transition-all duration-300 group-hover:scale-110"
                style={{
                  transform: open ? "rotate(180deg)" : "rotate(0deg)",
                }}
              >
                <ChevronDown className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="border-t border-border pt-6 bg-muted/30">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Ready to start reviewing this prompt set?
                </div>
                <Button
                  asChild
                  variant="default"
                  size="default"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  <Link href={`/review/${item.id}/${item.firstPromptId}`}>
                    Start Review
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
