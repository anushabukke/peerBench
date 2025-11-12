/**
 * User Score Stats Display
 */

'use client';

import type { UserScoreStats } from '@/lib/userScore';

interface UserScoreStatsProps {
  stats: UserScoreStats;
}

export function UserScoreStatsDisplay({ stats }: UserScoreStatsProps) {
  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm">
      <h3 className="text-lg font-semibold mb-4">User Score Statistics</h3>

      <div className="grid grid-cols-4 gap-6">
        {/* User Stats */}
        <div>
          <h4 className="font-medium mb-3 text-gray-900">Users</h4>
          <div className="space-y-2 text-sm">
            <StatRow label="Total Users" value={stats.totalUsers} />
            <StatRow
              label="With Score > 0"
              value={`${stats.usersWithScore} (${((stats.usersWithScore / stats.totalUsers) * 100).toFixed(1)}%)`}
            />
          </div>
        </div>

        {/* Score Stats */}
        <div>
          <h4 className="font-medium mb-3 text-gray-900">Scores</h4>
          <div className="space-y-2 text-sm">
            <StatRow label="Average" value={stats.averageScore.toFixed(1)} />
            <StatRow label="Median" value={stats.medianScore.toFixed(1)} />
            <StatRow label="Top 10%" value={stats.top10PercentileScore.toFixed(1)} />
          </div>
        </div>

        {/* Activity Stats */}
        <div>
          <h4 className="font-medium mb-3 text-gray-900">Activity</h4>
          <div className="space-y-2 text-sm">
            <StatRow label="Total Prompts" value={stats.totalPrompts} />
            <StatRow label="Total Feedbacks" value={stats.totalFeedbacks} />
            <StatRow label="Total Benchmarks" value={stats.totalBenchmarks} />
          </div>
        </div>

        {/* Averages */}
        <div>
          <h4 className="font-medium mb-3 text-gray-900">Per User Avg</h4>
          <div className="space-y-2 text-sm">
            <StatRow label="Prompts" value={stats.averagePromptsPerUser.toFixed(2)} />
            <StatRow label="Feedbacks" value={stats.averageFeedbacksPerUser.toFixed(2)} />
          </div>
        </div>
      </div>

      {/* Distribution */}
      <div className="mt-6">
        <h4 className="font-medium mb-3 text-gray-900">Score Distribution</h4>
        <div className="flex gap-2 flex-wrap">
          {stats.scoresDistribution.map((bucket) => (
            <div
              key={bucket.range}
              className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 rounded text-sm"
            >
              <span className="font-mono font-semibold">{bucket.range}</span>
              <span className="text-gray-600">→</span>
              <span className="font-bold text-blue-600">{bucket.count}</span>
              <span className="text-gray-600 text-xs">users</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between py-1 border-b border-gray-200">
      <span className="text-gray-700">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
