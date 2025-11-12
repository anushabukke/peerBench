"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LucideMessageSquare,
  LucideUser,
  LucideCalendar,
  LucideChevronDown,
  LucideChevronUp,
  LucideLoader2,
} from "lucide-react";
import { DateTime } from "luxon";
import { ReviewOpinion } from "@/types/review";

// TODO: Refactor this component ("load more" or "pagination" based approach) and use global api hooks rather than direct fetch call

interface TestResultReview {
  id: number;
  userId: string;
  opinion: ReviewOpinion;
  comment: string;
  createdAt: string;
  flags: Array<{
    id: number;
    value: string;
    opinion: ReviewOpinion;
  }>;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface TestResultReviewsProps {
  testResultId: number;
  modelName: string;
}

export default function TestResultReviews({
  testResultId,
  modelName,
}: TestResultReviewsProps) {
  const [reviews, setReviews] = useState<TestResultReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/v1/reviews?testResultId=${testResultId}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch reviews: ${response.statusText}`);
        }

        const data = await response.json();
        setReviews(data.data || []);
      } catch (err) {
        console.error("Error fetching reviews:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch reviews"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [testResultId]);

  const getOpinionColor = (opinion: ReviewOpinion) => {
    switch (opinion) {
      case "positive":
        return "bg-green-100 text-green-800 border-green-200";
      case "negative":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getOpinionIcon = (opinion: ReviewOpinion) => {
    switch (opinion) {
      case "positive":
        return "👍";
      case "negative":
        return "👎";
      default:
        return "❓";
    }
  };

  if (loading) {
    return (
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <LucideLoader2 className="w-4 h-4 animate-spin" />
          <span>Loading reviews for {modelName}...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 p-3 bg-red-50 rounded-lg">
        <p className="text-sm text-red-600">Error loading reviews: {error}</p>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <LucideMessageSquare className="w-4 h-4" />
            <span>No reviews yet for {modelName}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full justify-between p-2 h-auto text-left"
      >
        <div className="flex items-center gap-2">
          <LucideMessageSquare className="w-4 h-4" />
          <span className="text-sm font-medium">
            Reviews for {modelName} ({reviews.length})
          </span>
        </div>
        {isExpanded ? (
          <LucideChevronUp className="w-4 h-4" />
        ) : (
          <LucideChevronDown className="w-4 h-4" />
        )}
      </Button>

      {isExpanded && (
        <div className="mt-2 space-y-3">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="border rounded-lg p-3 bg-white hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <LucideUser className="w-3 h-3 text-gray-500" />
                    <span className="text-sm font-medium text-gray-900">
                      {review.user.name || review.user.email}
                    </span>
                    <span className="text-xs text-gray-500 font-mono">
                      ({review.user.id})
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`px-2 py-1 text-xs ${getOpinionColor(review.opinion)}`}
                  >
                    <span className="mr-1">
                      {getOpinionIcon(review.opinion)}
                    </span>
                    {review.opinion.charAt(0).toUpperCase() +
                      review.opinion.slice(1)}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <LucideCalendar className="w-3 h-3" />
                  <span>{DateTime.fromISO(review.createdAt).toRelative()}</span>
                </div>
              </div>

              {review.comment && (
                <div className="mb-2">
                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {review.comment}
                  </p>
                </div>
              )}

              {review.flags && review.flags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {review.flags.map((flag) => (
                    <Badge
                      key={flag.id}
                      variant="secondary"
                      className="text-xs px-2 py-0.5"
                    >
                      {flag.value}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
