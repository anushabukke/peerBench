"use client";

import { useEffect, useState } from "react";
import { LeaderboardTable } from "./components/LeaderboardTable";
import { usePreloader } from "@/hooks/usePreloader";
import LoadingSpinner from "@/components/loading-spinner";

export default function LeaderboardPage() {
  const { getCachedData, isDataAvailable, isPreloading } = usePreloader();
  const [leaderboards, setLeaderboards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      // Try to get cached data first
      const cachedLeaderboards = getCachedData("leaderboard");
      if (cachedLeaderboards) {
        // Convert string dates to Date objects for cached data too
        const processedCachedData = cachedLeaderboards.map(
          (leaderboard: any) => ({
            ...leaderboard,
            entries: leaderboard.entries.map((entry: any) => ({
              ...entry,
              recentEvaluation: new Date(entry.recentEvaluation),
            })),
          })
        );
        setLeaderboards(processedCachedData);
        setIsLoading(false);
        return;
      }

      // If no cached data, fetch fresh data
      if (!isDataAvailable("leaderboard") && !isPreloading) {
        try {
          const response = await fetch("/api/v1/leaderboard");
          if (response.ok) {
            const data = await response.json();
            // Convert string dates to Date objects
            const processedData = data.map((leaderboard: any) => ({
              ...leaderboard,
              entries: leaderboard.entries.map((entry: any) => ({
                ...entry,
                recentEvaluation: new Date(entry.recentEvaluation),
              })),
            }));
            setLeaderboards(processedData);
          } else {
            console.error("Failed to fetch leaderboard data");
          }
        } catch (error) {
          console.error("Error loading leaderboard data:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadData();
  }, [getCachedData, isDataAvailable, isPreloading]);

  if (isLoading || isPreloading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingSpinner position="block" />
      </div>
    );
  }
  if (leaderboards.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-4">
        No leaderboards available.
      </div>
    );
  }

  // The leaderboard that has the most recent test evaluation, will be at the top
  leaderboards
    .sort((a, b) => {
      // Get the most recent entry from each leaderboard
      const aMostRecentRun = Math.max(
        ...a.entries.map((entry: any) => entry.recentEvaluation.getTime())
      );
      const bMostRecentRun = Math.max(
        ...b.entries.map((entry: any) => entry.recentEvaluation.getTime())
      );

      return bMostRecentRun - aMostRecentRun;
    })
    .sort((a, b) => {
      return a.promptType?.localeCompare(b.promptType || "") || 0;
    });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">
            Model Leaderboard
          </h2>
        </div>

        <div className="space-y-4">
          {leaderboards.map((leaderboard) => (
            <LeaderboardTable key={leaderboard.context} data={leaderboard} />
          ))}
        </div>
      </div>
    </div>
  );
}
