/**
 * Reviewer Leaderboard Component
 *
 * Displays ranked list of reviewers with Pearson correlation scores.
 */

'use client';

import type { ReviewerLeaderboardEntry } from '@/lib/leaderboard';

interface ReviewerLeaderboardProps {
  data: ReviewerLeaderboardEntry[];
}

export function ReviewerLeaderboard({ data }: ReviewerLeaderboardProps) {
  if (data.length === 0) {
    return (
      <div className="border rounded-lg p-6 bg-white shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Reviewer Leaderboard</h3>
        <div className="text-gray-600 text-center py-8">
          No reviewers to rank. Reviewers need at least 5 reviews to qualify.
        </div>
      </div>
    );
  }

  const getCorrelationColor = (correlation: number) => {
    if (correlation >= 0.7) return 'text-green-600';
    if (correlation >= 0.3) return 'text-blue-600';
    if (correlation >= 0) return 'text-gray-600';
    return 'text-red-600';
  };

  const getCorrelationLabel = (correlation: number) => {
    if (correlation >= 0.7) return 'Excellent';
    if (correlation >= 0.3) return 'Good';
    if (correlation >= 0) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm">
      <h3 className="text-lg font-semibold mb-4">
        Reviewer Leaderboard
        <span className="text-sm font-normal text-gray-600 ml-2">
          ({data.length} reviewers)
        </span>
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="text-left py-3 px-2 font-semibold">Rank</th>
              <th className="text-left py-3 px-2 font-semibold">Reviewer</th>
              <th className="text-right py-3 px-2 font-semibold">
                Pearson Correlation
              </th>
              <th className="text-right py-3 px-2 font-semibold">Alignment</th>
              <th className="text-right py-3 px-2 font-semibold">Reviews</th>
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
                <td className="py-3 px-2 text-right">
                  <span
                    className={`font-semibold ${getCorrelationColor(entry.pearsonCorrelation)}`}
                  >
                    {entry.pearsonCorrelation.toFixed(3)}
                  </span>
                </td>
                <td className="py-3 px-2 text-right">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      entry.pearsonCorrelation >= 0.7
                        ? 'bg-green-100 text-green-800'
                        : entry.pearsonCorrelation >= 0.3
                          ? 'bg-blue-100 text-blue-800'
                          : entry.pearsonCorrelation >= 0
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {getCorrelationLabel(entry.pearsonCorrelation)}
                  </span>
                </td>
                <td className="py-3 px-2 text-right">{entry.reviewCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
        <strong>Pearson Correlation:</strong> Measures how well a reviewer&apos;s opinions align
        with consensus. Range: -1 (always disagrees) to +1 (always agrees).
      </div>

      {data.length > 10 && (
        <div className="mt-4 text-sm text-gray-600 text-center">
          Showing all {data.length} reviewers
        </div>
      )}
    </div>
  );
}
