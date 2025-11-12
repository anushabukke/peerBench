/**
 * Data Source Selector Component
 *
 * Allows user to choose between real database data or simulated data.
 */

'use client';

import type { DataSourceType } from '@/lib/leaderboard';

interface DataSourceSelectorProps {
  selected: DataSourceType;
  onChange: (source: DataSourceType) => void;
  disabled?: boolean;
}

export function DataSourceSelector({
  selected,
  onChange,
  disabled = false,
}: DataSourceSelectorProps) {
  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm">
      <h2 className="text-xl font-semibold mb-4">1. Select Data Source</h2>

      <div className="space-y-3">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="radio"
            name="dataSource"
            value="real"
            checked={selected === 'real'}
            onChange={() => onChange('real')}
            disabled={disabled}
            className="w-4 h-4 text-blue-600"
          />
          <div>
            <div className="font-medium">Use Real Database Data</div>
            <div className="text-sm text-gray-600">
              Calculate scores using current prompts and feedbacks from the database
            </div>
          </div>
        </label>

        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="radio"
            name="dataSource"
            value="simulated"
            checked={selected === 'simulated'}
            onChange={() => onChange('simulated')}
            disabled={disabled}
            className="w-4 h-4 text-blue-600"
          />
          <div>
            <div className="font-medium">Simulate New Data</div>
            <div className="text-sm text-gray-600">
              Generate virtual users, prompts, and feedbacks for testing
            </div>
          </div>
        </label>
      </div>
    </div>
  );
}
