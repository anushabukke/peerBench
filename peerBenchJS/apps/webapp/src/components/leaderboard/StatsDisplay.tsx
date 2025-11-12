/**
 * Stats Display Component
 *
 * Shows statistics about the input data.
 */

'use client';

import type { LeaderboardStats } from '@/lib/leaderboard';

interface StatsDisplayProps {
  stats: LeaderboardStats;
}

export function StatsDisplay({ stats }: StatsDisplayProps) {
  const StatRow = ({ label, value }: { label: string; value: string | number }) => (
    <div className="flex justify-between py-2 border-b border-gray-200">
      <span className="text-gray-700">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );

  const formatPercentage = (value: number, total: number) => {
    if (total === 0) return '0%';
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Input Data Statistics</h3>

      <div className="grid grid-cols-3 gap-6">
        {/* Users */}
        <div>
          <h4 className="font-medium mb-3 text-gray-900">Users</h4>
          <div className="space-y-1 text-sm">
            <StatRow label="Total Users" value={stats.totalUsers} />
            <StatRow
              label="With Affiliation"
              value={`${stats.usersWithAffiliation} (${formatPercentage(stats.usersWithAffiliation, stats.totalUsers)})`}
            />
          </div>
        </div>

        {/* Prompts */}
        <div>
          <h4 className="font-medium mb-3 text-gray-900">Prompts</h4>
          <div className="space-y-1 text-sm">
            <StatRow label="Total Prompts" value={stats.totalPrompts} />
            <StatRow
              label="With 0 Reviews"
              value={`${stats.promptsWithNoReviews} (${formatPercentage(stats.promptsWithNoReviews, stats.totalPrompts)})`}
            />
            <StatRow
              label="With 1 Review"
              value={`${stats.promptsWith1Review} (${formatPercentage(stats.promptsWith1Review, stats.totalPrompts)})`}
            />
            <StatRow
              label="With 2 Reviews"
              value={`${stats.promptsWith2Reviews} (${formatPercentage(stats.promptsWith2Reviews, stats.totalPrompts)})`}
            />
            <StatRow
              label="With ≥3 Reviews"
              value={`${stats.promptsWith3PlusReviews} (${formatPercentage(stats.promptsWith3PlusReviews, stats.totalPrompts)})`}
            />
            <StatRow label="Avg Reviews/Prompt" value={stats.avgReviewsPerPrompt.toFixed(2)} />
          </div>
        </div>

        {/* Reviewers & Feedbacks */}
        <div>
          <h4 className="font-medium mb-3 text-gray-900">Reviewers</h4>
          <div className="space-y-1 text-sm">
            <StatRow label="Total Reviewers" value={stats.totalReviewers} />
            <StatRow
              label="With ≥5 Reviews"
              value={`${stats.reviewersWith5PlusReviews} (${formatPercentage(stats.reviewersWith5PlusReviews, stats.totalReviewers)})`}
            />
            <StatRow
              label="Avg Reviews/Reviewer"
              value={stats.avgReviewsPerReviewer.toFixed(2)}
            />
          </div>

          <h4 className="font-medium mt-4 mb-3 text-gray-900">Feedbacks</h4>
          <div className="space-y-1 text-sm">
            <StatRow label="Total Feedbacks" value={stats.totalFeedbacks} />
            <StatRow
              label="Positive"
              value={`${stats.positiveFeedbacks} (${formatPercentage(stats.positiveFeedbacks, stats.totalFeedbacks)})`}
            />
            <StatRow
              label="Negative"
              value={`${stats.negativeFeedbacks} (${formatPercentage(stats.negativeFeedbacks, stats.totalFeedbacks)})`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
