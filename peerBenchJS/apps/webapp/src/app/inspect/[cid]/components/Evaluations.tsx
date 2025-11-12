"use client";

import { useState, useMemo } from "react";
import { EvaluationItem as EvaluationItemType } from "@/services/evaluation.service";
import EvaluationItem from "./evaluation-item";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type User } from "@supabase/supabase-js";

export default function Evaluations({
  evaluations,
  user,
}: {
  evaluations: EvaluationItemType[];
  user: User | null;
}) {
  // Extract unique provider IDs from evaluations
  const providerOptions = useMemo(() => {
    const ids = Array.from(
      new Set(
        evaluations
          .map((ev) => (ev.providerId !== undefined ? ev.providerId : null))
          .filter((id): id is number => id !== null && id !== undefined)
      )
    );
    return ids.map((id) => ({ value: id, label: `Provider ${id}` }));
  }, [evaluations]);

  const [selectedProviderId, setSelectedProviderId] = useState<string>("all");

  return (
    <>
      {providerOptions.length > 1 && (
        <div className="mb-6">
          <label
            htmlFor="provider-filter"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Filters
          </label>
          <Select
            value={selectedProviderId}
            onValueChange={setSelectedProviderId}
          >
            <SelectTrigger className="bg-white dark:bg-gray-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Providers</SelectItem>
              {providerOptions.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-4">
        {evaluations.map((evaluation, index) => {
          if (
            selectedProviderId !== "all" &&
            evaluation.providerId !== parseInt(selectedProviderId)
          ) {
            return null;
          }

          return (
            <EvaluationItem
              key={evaluation.id}
              evaluationIndex={index}
              evaluation={evaluation}
              user={user}
            />
          );
        })}
      </div>
    </>
  );
}
