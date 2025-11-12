/**
 * Coefficient Editor Component
 *
 * Allows user to configure scoring algorithm coefficients.
 */

'use client';

import type { AllCoefficients } from '@/lib/leaderboard';
import { DEFAULT_COEFFICIENTS } from '@/lib/leaderboard';

interface CoefficientEditorProps {
  coefficients: AllCoefficients;
  onChange: (coefficients: AllCoefficients) => void;
}

export function CoefficientEditor({ coefficients, onChange }: CoefficientEditorProps) {
  const handleReset = () => {
    onChange(DEFAULT_COEFFICIENTS);
  };

  const updateContributor = <K extends keyof AllCoefficients['contributor']>(
    key: K,
    value: AllCoefficients['contributor'][K]
  ) => {
    onChange({
      ...coefficients,
      contributor: { ...coefficients.contributor, [key]: value },
    });
  };

  const updateReviewer = <K extends keyof AllCoefficients['reviewer']>(
    key: K,
    value: AllCoefficients['reviewer'][K]
  ) => {
    onChange({
      ...coefficients,
      reviewer: { ...coefficients.reviewer, [key]: value },
    });
  };

  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">2. Configure Algorithm Coefficients</h2>
        <button
          onClick={handleReset}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Reset to Defaults
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Contributor Coefficients */}
        <div className="space-y-4">
          <h3 className="font-medium text-lg">Contributor Scoring</h3>

          <div>
            <label className="block text-sm font-medium mb-1">
              Affiliation Bonus Points
            </label>
            <input
              type="number"
              value={coefficients.contributor.affiliationBonusPoints}
              onChange={(e) =>
                updateContributor('affiliationBonusPoints', parseFloat(e.target.value))
              }
              step="1"
              className="w-full border rounded px-3 py-2"
            />
            <div className="text-xs text-gray-600 mt-1">
              Bonus points for users with organizational affiliation
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Quality Weight
            </label>
            <input
              type="number"
              value={coefficients.contributor.qualityWeight}
              onChange={(e) => updateContributor('qualityWeight', parseFloat(e.target.value))}
              step="0.1"
              min="0"
              max="1"
              className="w-full border rounded px-3 py-2"
            />
            <div className="text-xs text-gray-600 mt-1">
              Weight for prompt quality in test weight calculation (paper: 0.7)
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Reputation Weight
            </label>
            <input
              type="number"
              value={coefficients.contributor.reputationWeight}
              onChange={(e) =>
                updateContributor('reputationWeight', parseFloat(e.target.value))
              }
              step="0.1"
              min="0"
              max="1"
              className="w-full border rounded px-3 py-2"
            />
            <div className="text-xs text-gray-600 mt-1">
              Weight for contributor reputation (paper: 0.3)
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Reputation Cap
            </label>
            <input
              type="number"
              value={coefficients.contributor.reputationCap}
              onChange={(e) => updateContributor('reputationCap', parseFloat(e.target.value))}
              step="0.5"
              min="0"
              className="w-full border rounded px-3 py-2"
            />
            <div className="text-xs text-gray-600 mt-1">
              Maximum reputation multiplier (paper: 2)
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Minimum Reviews for Quality
            </label>
            <input
              type="number"
              value={coefficients.contributor.minReviewsForQuality}
              onChange={(e) =>
                updateContributor('minReviewsForQuality', parseInt(e.target.value))
              }
              min="1"
              className="w-full border rounded px-3 py-2"
            />
            <div className="text-xs text-gray-600 mt-1">
              Prompts with fewer reviews get quality score of 0
            </div>
          </div>
        </div>

        {/* Reviewer Coefficients */}
        <div className="space-y-4">
          <h3 className="font-medium text-lg">Reviewer Scoring</h3>

          <div>
            <label className="block text-sm font-medium mb-1">
              Minimum Reviews Required
            </label>
            <input
              type="number"
              value={coefficients.reviewer.minReviewsRequired}
              onChange={(e) =>
                updateReviewer('minReviewsRequired', parseInt(e.target.value))
              }
              min="1"
              className="w-full border rounded px-3 py-2"
            />
            <div className="text-xs text-gray-600 mt-1">
              Reviewers with fewer reviews are not ranked
            </div>
          </div>

          <div className="bg-gray-50 rounded p-4 text-sm text-gray-700">
            <p className="font-medium mb-2">Reviewer Score Formula:</p>
            <p className="font-mono text-xs">
              score = Pearson({'{'}reviewer_ratings{'}'}, {'{'}consensus{'}'})
            </p>
            <p className="mt-2">
              Pearson correlation measures how well a reviewer&apos;s opinions align with the
              consensus of other reviewers. Range: -1 (always disagrees) to +1 (always
              agrees).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
