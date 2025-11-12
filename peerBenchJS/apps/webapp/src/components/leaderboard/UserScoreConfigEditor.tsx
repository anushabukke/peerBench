/**
 * User Score Config Editor Component
 *
 * Allows editing all user score coefficients and thresholds
 */

'use client';

import type { UserScoreConfig } from '@/lib/userScore';
import { DEFAULT_USER_SCORE_CONFIG } from '@/lib/userScore';

interface UserScoreConfigEditorProps {
  config: UserScoreConfig;
  onChange: (config: UserScoreConfig) => void;
}

export function UserScoreConfigEditor({ config, onChange }: UserScoreConfigEditorProps) {
  const handleReset = () => {
    onChange(DEFAULT_USER_SCORE_CONFIG);
  };

  const updateConfig = <K extends keyof UserScoreConfig>(
    key: K,
    value: UserScoreConfig[K]
  ) => {
    onChange({ ...config, [key]: value });
  };

  const updateSOTAModels = (models: string) => {
    const modelList = models
      .split(',')
      .map((m) => m.trim())
      .filter((m) => m.length > 0);
    onChange({ ...config, sotaModels: modelList });
  };

  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">User Score Configuration</h2>
        <button
          onClick={handleReset}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Reset to Defaults
        </button>
      </div>

      <div className="space-y-6">
        {/* One-Time Bonuses */}
        <div>
          <h3 className="font-medium text-lg mb-3">One-Time Bonuses</h3>
          <div className="grid grid-cols-2 gap-4">
            <ConfigInput
              label="Affiliation Bonus"
              value={config.affiliationBonus}
              onChange={(v) => updateConfig('affiliationBonus', v)}
              hint="Points for university affiliation"
            />
            <ConfigInput
              label="Benchmark Creator Bonus"
              value={config.benchmarkCreatorBonus}
              onChange={(v) => updateConfig('benchmarkCreatorBonus', v)}
              hint="Points for creating collaborative benchmark"
            />
            <ConfigInput
              label="Diverse Feedback (Benchmarks)"
              value={config.diverseFeedbackBenchmarksBonus}
              onChange={(v) => updateConfig('diverseFeedbackBenchmarksBonus', v)}
              hint="Points for reviewing multiple benchmarks"
            />
            <ConfigInput
              label="Diverse Feedback (Users)"
              value={config.diverseFeedbackUsersBonus}
              onChange={(v) => updateConfig('diverseFeedbackUsersBonus', v)}
              hint="Points for reviewing multiple users"
            />
            <ConfigInput
              label="Quality Prompts Bonus"
              value={config.qualityPromptsBonus}
              onChange={(v) => updateConfig('qualityPromptsBonus', v)}
              hint="Points for having quality prompts"
            />
            <ConfigInput
              label="Difficult Prompts Bonus"
              value={config.difficultPromptsBonus}
              onChange={(v) => updateConfig('difficultPromptsBonus', v)}
              hint="Points for stumping models"
            />
            <ConfigInput
              label="SOTA Difficult Prompts Bonus"
              value={config.sotaDifficultPromptsBonus}
              onChange={(v) => updateConfig('sotaDifficultPromptsBonus', v)}
              hint="Points for stumping SOTA models"
            />
          </div>
        </div>

        {/* Continuous Component Coefficients */}
        <div>
          <h3 className="font-medium text-lg mb-3">Continuous Component Coefficients</h3>
          <div className="grid grid-cols-2 gap-4">
            <ConfigInput
              label="H-Index Coefficient"
              value={config.hIndexCoefficient}
              onChange={(v) => updateConfig('hIndexCoefficient', v)}
              hint="Multiplier for h²"
              step="0.5"
            />
            <ConfigInput
              label="Quality Prompts Coefficient"
              value={config.qualityPromptsCoefficient}
              onChange={(v) => updateConfig('qualityPromptsCoefficient', v)}
              hint="Points per quality prompt"
              step="1"
            />
            <ConfigInput
              label="Feedback Activity Coefficient"
              value={config.feedbackActivityCoefficient}
              onChange={(v) => updateConfig('feedbackActivityCoefficient', v)}
              hint="Points per feedback given"
              step="0.1"
            />
            <ConfigInput
              label="Collaboration Coefficient"
              value={config.collaborationCoefficient}
              onChange={(v) => updateConfig('collaborationCoefficient', v)}
              hint="Points per collaborator"
              step="1"
            />
          </div>
        </div>

        {/* Thresholds */}
        <div>
          <h3 className="font-medium text-lg mb-3">Thresholds</h3>
          <div className="grid grid-cols-3 gap-4">
            <ConfigInput
              label="Min Positive Feedbacks"
              value={config.minPositiveFeedbacks}
              onChange={(v) => updateConfig('minPositiveFeedbacks', v)}
              hint="For quality prompt threshold"
              step="1"
              min="1"
            />
            <ConfigInput
              label="Min Benchmark Contributors"
              value={config.minBenchmarkContributors}
              onChange={(v) => updateConfig('minBenchmarkContributors', v)}
              hint="For benchmark creator bonus"
              step="1"
              min="1"
            />
            <ConfigInput
              label="Min Feedback Benchmarks"
              value={config.minFeedbackBenchmarks}
              onChange={(v) => updateConfig('minFeedbackBenchmarks', v)}
              hint="For diverse feedback bonus"
              step="1"
              min="1"
            />
            <ConfigInput
              label="Min Feedback Users"
              value={config.minFeedbackUsers}
              onChange={(v) => updateConfig('minFeedbackUsers', v)}
              hint="For diverse feedback bonus"
              step="1"
              min="1"
            />
            <ConfigInput
              label="Min Quality Prompts"
              value={config.minQualityPrompts}
              onChange={(v) => updateConfig('minQualityPrompts', v)}
              hint="For quality prompts bonus"
              step="1"
              min="1"
            />
            <ConfigInput
              label="Min Difficult Prompts"
              value={config.minDifficultPrompts}
              onChange={(v) => updateConfig('minDifficultPrompts', v)}
              hint="For difficult prompts bonuses"
              step="1"
              min="1"
            />
            <ConfigInput
              label="Wrong Answer Threshold"
              value={config.wrongAnswerThreshold}
              onChange={(v) => updateConfig('wrongAnswerThreshold', v)}
              hint="Score below which = wrong"
              step="0.1"
              min="0"
              max="1"
            />
          </div>
        </div>

        {/* SOTA Models */}
        <div>
          <h3 className="font-medium text-lg mb-3">SOTA Models (comma-separated)</h3>
          <textarea
            value={config.sotaModels.join(', ')}
            onChange={(e) => updateSOTAModels(e.target.value)}
            className="w-full border rounded px-3 py-2 font-mono text-sm"
            rows={3}
            placeholder="claude-sonnet-4.5, gpt-4o, ..."
          />
          <div className="text-xs text-gray-600 mt-1">
            Enter model names or identifiers that should be considered state-of-the-art
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfigInput({
  label,
  value,
  onChange,
  hint,
  step = '1',
  min = '0',
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint?: string;
  step?: string;
  min?: string;
  max?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        step={step}
        min={min}
        max={max}
        className="w-full border rounded px-3 py-2"
      />
      {hint && <div className="text-xs text-gray-600 mt-1">{hint}</div>}
    </div>
  );
}
