/**
 * User Score Leaderboard Component
 *
 * Displays comprehensive user scores with detailed breakdowns
 */

'use client';

import React, { useState } from 'react';
import type { UserScoreEntry } from '@/lib/userScore';

interface UserScoreLeaderboardProps {
  data: UserScoreEntry[];
}

export function UserScoreLeaderboard({ data }: UserScoreLeaderboardProps) {
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  if (data.length === 0) {
    return (
      <div className="border rounded-lg p-6 bg-white shadow-sm">
        <h3 className="text-lg font-semibold mb-4">User Score Leaderboard</h3>
        <div className="text-gray-600 text-center py-8">
          No users to rank. Run a calculation first.
        </div>
      </div>
    );
  }

  const toggleExpanded = (userId: string) => {
    setExpandedUserId(expandedUserId === userId ? null : userId);
  };

  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm">
      <h3 className="text-lg font-semibold mb-4">
        User Score Leaderboard
        <span className="text-sm font-normal text-gray-600 ml-2">
          ({data.length} users)
        </span>
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="text-left py-3 px-2 font-semibold">Rank</th>
              <th className="text-left py-3 px-2 font-semibold">User</th>
              <th className="text-right py-3 px-2 font-semibold">Total Score</th>
              <th className="text-right py-3 px-2 font-semibold">Bonuses</th>
              <th className="text-right py-3 px-2 font-semibold">Continuous</th>
              <th className="text-right py-3 px-2 font-semibold">H-Index</th>
              <th className="text-right py-3 px-2 font-semibold">Prompts</th>
              <th className="text-right py-3 px-2 font-semibold">Feedbacks</th>
              <th className="text-center py-3 px-2 font-semibold">Details</th>
            </tr>
          </thead>
          <tbody>
            {data.map((entry, index) => (
              <React.Fragment key={entry.userId}>
                <tr
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
                    <div className="text-xs text-gray-500">
                      {entry.userId.slice(0, 8)}...
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right font-bold text-lg">
                    {entry.totalScore.toFixed(0)}
                  </td>
                  <td className="py-3 px-2 text-right text-gray-600">
                    {entry.components.totalBonuses.toFixed(0)}
                  </td>
                  <td className="py-3 px-2 text-right text-gray-600">
                    {entry.components.totalContinuous.toFixed(0)}
                  </td>
                  <td className="py-3 px-2 text-right font-semibold">
                    {entry.components.continuous.hIndex}
                  </td>
                  <td className="py-3 px-2 text-right">{entry.promptsCreated}</td>
                  <td className="py-3 px-2 text-right">{entry.feedbacksGiven}</td>
                  <td className="py-3 px-2 text-center">
                    <button
                      onClick={() => toggleExpanded(entry.userId)}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      {expandedUserId === entry.userId ? '▼ Hide' : '▶ Show'}
                    </button>
                  </td>
                </tr>
                {expandedUserId === entry.userId && (
                  <tr className="bg-blue-50">
                    <td colSpan={9} className="py-4 px-6">
                      <div className="grid grid-cols-2 gap-6">
                        {/* One-time Bonuses */}
                        <div>
                          <h4 className="font-semibold mb-2 text-gray-900">
                            One-Time Bonuses
                          </h4>
                          <div className="space-y-1 text-sm">
                            <BonusRow
                              label="Affiliation"
                              hasBonus={entry.components.bonuses.hasAffiliation}
                              points={entry.components.bonuses.affiliationPoints}
                            />
                            <BonusRow
                              label="Benchmark Creator"
                              hasBonus={entry.components.bonuses.hasBenchmarkCreator}
                              points={entry.components.bonuses.benchmarkCreatorPoints}
                            />
                            <BonusRow
                              label="Diverse Feedback (Benchmarks)"
                              hasBonus={entry.components.bonuses.hasDiverseFeedbackBenchmarks}
                              points={
                                entry.components.bonuses.diverseFeedbackBenchmarksPoints
                              }
                            />
                            <BonusRow
                              label="Diverse Feedback (Users)"
                              hasBonus={entry.components.bonuses.hasDiverseFeedbackUsers}
                              points={entry.components.bonuses.diverseFeedbackUsersPoints}
                            />
                            <BonusRow
                              label="Quality Prompts"
                              hasBonus={entry.components.bonuses.hasQualityPrompts}
                              points={entry.components.bonuses.qualityPromptsPoints}
                            />
                            <BonusRow
                              label="Difficult Prompts"
                              hasBonus={entry.components.bonuses.hasDifficultPrompts}
                              points={entry.components.bonuses.difficultPromptsPoints}
                            />
                            <BonusRow
                              label="SOTA Difficult Prompts"
                              hasBonus={entry.components.bonuses.hasSotaDifficultPrompts}
                              points={entry.components.bonuses.sotaDifficultPromptsPoints}
                            />
                          </div>
                        </div>

                        {/* Continuous Components */}
                        <div>
                          <h4 className="font-semibold mb-2 text-gray-900">
                            Continuous Components
                          </h4>
                          <div className="space-y-1 text-sm">
                            <ContinuousRow
                              label="H-Index"
                              value={entry.components.continuous.hIndex}
                              points={entry.components.continuous.hIndexPoints}
                            />
                            <ContinuousRow
                              label="Quality Prompts"
                              value={entry.components.continuous.qualityPromptsCount}
                              points={entry.components.continuous.qualityPromptsPoints}
                            />
                            <ContinuousRow
                              label="Feedback Activity"
                              value={entry.components.continuous.feedbackCount}
                              points={entry.components.continuous.feedbackActivityPoints}
                            />
                            <ContinuousRow
                              label="Collaborators"
                              value={entry.components.continuous.collaboratorCount}
                              points={entry.components.continuous.collaborationPoints}
                            />
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {data.length > 10 && (
        <div className="mt-4 text-sm text-gray-600 text-center">
          Showing all {data.length} users
        </div>
      )}
    </div>
  );
}

function BonusRow({
  label,
  hasBonus,
  points,
}: {
  label: string;
  hasBonus: boolean;
  points: number;
}) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-gray-700">
        {hasBonus ? '✓' : '✗'} {label}
      </span>
      <span className={hasBonus ? 'font-semibold text-green-600' : 'text-gray-400'}>
        {hasBonus ? `+${points}` : '0'}
      </span>
    </div>
  );
}

function ContinuousRow({
  label,
  value,
  points,
}: {
  label: string;
  value: number;
  points: number;
}) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-gray-700">
        {label}: <span className="font-mono text-xs">{value}</span>
      </span>
      <span className="font-semibold text-blue-600">+{points.toFixed(1)}</span>
    </div>
  );
}
