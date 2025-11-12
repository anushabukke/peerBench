/**
 * Beta Scores 002 Page
 *
 * Experimental page for User Score system.
 * All calculations happen client-side - no database writes.
 */

'use client';

import { useState } from 'react';
import type {
  DataSourceType,
  SimulatedData,
} from '@/lib/leaderboard';
import type {
  UserScoreConfig,
  UserScoreResults,
  UserScoreInputData,
} from '@/lib/userScore';
import {
  DEFAULT_USER_SCORE_CONFIG,
  calculateUserScoreResults,
  downloadUserScoreResultsAsJSON,
  fetchUserScoreData,
} from '@/lib/userScore';
import {
  DataSourceSelector,
  SimulationConfigComponent,
  UserScoreConfigEditor,
  UserScoreStatsDisplay,
  UserScoreLeaderboard,
} from '@/components/leaderboard';

export default function BetaScores002Page() {
  const [dataSource, setDataSource] = useState<DataSourceType>('real');
  const [simulatedData, setSimulatedData] = useState<SimulatedData | null>(null);
  const [config, setConfig] = useState<UserScoreConfig>(DEFAULT_USER_SCORE_CONFIG);
  const [results, setResults] = useState<UserScoreResults | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDataSourceChange = (source: DataSourceType) => {
    setDataSource(source);
    setResults(null);
    setError(null);
  };

  const handleSimulationComplete = (data: SimulatedData) => {
    setSimulatedData(data);
    setResults(null);
    setError(null);
  };

  const handleCalculate = async () => {
    setIsCalculating(true);
    setError(null);

    try {
      let inputData: UserScoreInputData;

      if (dataSource === 'real') {
        // Fetch real data from database
        const realData = await fetchUserScoreData();
        inputData = realData;
      } else {
        // Use simulated data and transform to UserScoreInputData
        if (!simulatedData) {
          throw new Error('No simulated data available. Run simulation first.');
        }

        // Transform simulated data to UserScoreInputData format
        inputData = transformSimulatedToUserScoreData(simulatedData);
      }

      // Calculate user scores client-side
      const calculatedResults = calculateUserScoreResults(inputData, config);
      setResults(calculatedResults);
    } catch (err) {
      console.error('Calculation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to calculate user scores');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleExportJSON = () => {
    if (!results) return;

    const filename = `user-scores-${dataSource}-${new Date().toISOString().split('T')[0]}.json`;
    downloadUserScoreResultsAsJSON(results, filename);
  };

  const canCalculate =
    (dataSource === 'real' || (dataSource === 'simulated' && simulatedData !== null)) &&
    !isCalculating;

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Beta: User Score System (v0002)
          </h1>
          <p className="text-gray-600">
            Comprehensive user contribution scoring. Combines bonuses for achievements with
            continuous metrics. All calculations happen client-side.
          </p>
          <div className="mt-2 text-sm text-blue-600">
            📚 See <code className="bg-blue-100 px-2 py-1 rounded">docs/algo/scores0002/README.md</code> for full documentation
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-100 border border-red-300 rounded-lg p-4 text-red-800">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Section 1: Data Source Selection */}
        <div className="mb-6">
          <DataSourceSelector
            selected={dataSource}
            onChange={handleDataSourceChange}
            disabled={isCalculating}
          />
        </div>

        {/* Simulation Config */}
        {dataSource === 'simulated' && (
          <div className="mb-6">
            <SimulationConfigComponent
              onSimulationComplete={handleSimulationComplete}
              simulatedData={simulatedData}
            />
          </div>
        )}

        {/* Section 2: User Score Configuration */}
        <div className="mb-6">
          <UserScoreConfigEditor config={config} onChange={setConfig} />
        </div>

        {/* Section 3: Calculate Button */}
        <div className="mb-6 flex justify-center">
          <button
            onClick={handleCalculate}
            disabled={!canCalculate}
            className="px-8 py-3 bg-purple-600 text-white text-lg rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg"
          >
            {isCalculating ? 'Calculating...' : '▶ Calculate User Scores'}
          </button>
        </div>

        {/* Section 4: Results */}
        {results && (
          <div className="space-y-6">
            {/* Stats */}
            <UserScoreStatsDisplay stats={results.stats} />

            {/* Export Button */}
            <div className="flex justify-end">
              <button
                onClick={handleExportJSON}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Export JSON
              </button>
            </div>

            {/* User Score Leaderboard */}
            <UserScoreLeaderboard data={results.scores} />

            {/* Metadata */}
            <div className="border rounded-lg p-4 bg-gray-50 text-sm text-gray-700">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <strong>Data Source:</strong> {dataSource}
                </div>
                <div>
                  <strong>Calculated At:</strong>{' '}
                  {results.calculatedAt.toLocaleString()}
                </div>
                <div>
                  <strong>Algorithm:</strong> scores0002-v1
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!results && !isCalculating && (
          <div className="border rounded-lg p-12 bg-white text-center text-gray-600">
            <p className="text-lg mb-2">No results yet</p>
            <p className="text-sm">
              {dataSource === 'simulated' && !simulatedData
                ? 'Run a simulation first, then click Calculate'
                : 'Click the Calculate button above to generate user scores'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Transform simulated leaderboard data to UserScoreInputData format
 */
function transformSimulatedToUserScoreData(
  simData: SimulatedData
): UserScoreInputData {
  // In simulation, we don't have benchmarks, responses, etc.
  // So we'll create minimal/empty structures for those

  // Convert users
  const users = simData.users.map((u) => ({
    id: u.id,
    displayName: u.displayName,
    hasAffiliation: u.hasAffiliation,
  }));

  // Convert prompts
  const prompts = simData.prompts.map((p) => ({
    id: p.id,
    creatorId: p.creatorId,
    question: p.question,
    promptSetId: undefined,
    category: undefined,
  }));

  // Convert feedbacks
  const feedbacks = simData.feedbacks.map((f) => ({
    id: f.id,
    userId: f.userId,
    promptId: f.promptId,
    opinion: f.opinion,
    promptSetId: undefined,
    promptCreatorId: simData.prompts.find((p) => p.id === f.promptId)?.creatorId,
  }));

  // Empty responses (simulation doesn't have model responses)
  const responses: any[] = [];

  // Empty benchmarks (simulation doesn't have prompt sets)
  const benchmarks: any[] = [];

  // Empty collaborations
  const collaborations: any[] = [];

  return {
    users,
    prompts,
    feedbacks,
    responses,
    benchmarks,
    collaborations,
  };
}
