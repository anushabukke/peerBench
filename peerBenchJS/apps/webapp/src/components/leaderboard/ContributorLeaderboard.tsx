/**
 * Contributor Leaderboard Component
 *
 * Displays ranked list of data contributors with scores.
 */

'use client';

import type { ContributorLeaderboardEntry } from '@/lib/leaderboard';

interface ContributorLeaderboardProps {
  data: ContributorLeaderboardEntry[];
}

export function ContributorLeaderboard({ data }: ContributorLeaderboardProps) {
  if (data.length === 0) {
    return (
      <div className="border rounded-lg p-6 bg-white shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Contributor Leaderboard</h3>
        <div className="text-gray-600 text-center py-8">
          No contributors to rank. Run a calculation first.
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm">
      <h3 className="text-lg font-semibold mb-4">
        Contributor Leaderboard
        <span className="text-sm font-normal text-gray-600 ml-2">
          ({data.length} contributors)
        </span>
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="text-left py-3 px-2 font-semibold">Rank</th>
              <th className="text-left py-3 px-2 font-semibold">Contributor</th>
              <th className="text-right py-3 px-2 font-semibold">Total Score</th>
              <th className="text-right py-3 px-2 font-semibold">Quality Score</th>
              <th className="text-right py-3 px-2 font-semibold">Affiliation Bonus</th>
              <th className="text-right py-3 px-2 font-semibold">Prompts</th>
              <th className="text-right py-3 px-2 font-semibold">Avg Quality</th>
            </tr>
          </thead>
          <tbody>
            {data.map((entry, index) => (
              <tr
                key={entry.userId}
                className={`border-b border-gray-200 hover:bg-gray-50 ${
                  index < 3 ? 'bg-yellow-50' : ''
                }`}
              >
                <td className="py-3 px-2">
                  {index === 0 && '🥇'}
                  {index === 1 && '🥈'}
                  {index === 2 && '🥉'}
                  {index > 2 && <span className="text-gray-600">{index + 1}</span>}
                </td>
                <td className="py-3 px-2">
                  <div className="font-medium">{entry.displayName}</div>
                  <div className="text-xs text-gray-500">{entry.userId.slice(0, 8)}...</div>
                </td>
                <td className="py-3 px-2 text-right font-semibold">
                  {entry.totalScore.toFixed(2)}
                </td>
                <td className="py-3 px-2 text-right">
                  {entry.qualityScore.toFixed(2)}
                </td>
                <td className="py-3 px-2 text-right">
                  {entry.affiliationBonus > 0 ? (
                    <span className="text-green-600 font-medium">
                      +{entry.affiliationBonus}
                    </span>
                  ) : (
                    <span className="text-gray-400">0</span>
                  )}
                </td>
                <td className="py-3 px-2 text-right">{entry.promptCount}</td>
                <td className="py-3 px-2 text-right">
                  {entry.avgPromptQuality.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length > 10 && (
        <div className="mt-4 text-sm text-gray-600 text-center">
          Showing all {data.length} contributors
        </div>
      )}
    </div>
  );
}
