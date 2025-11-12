/**
 * Admin Calc Page
 *
 * Hidden admin page for calculating and experimenting with leaderboard algorithms.
 * Everything happens client-side - no database writes, no API calls.
 */

'use client';

import { useState } from 'react';
import type {
  DataSourceType,
  SimulatedData,
  AllCoefficients,
  LeaderboardResults,
} from '@/lib/leaderboard';
import {
  DEFAULT_COEFFICIENTS,
  calculateLeaderboards,
  downloadResultsAsJSON,
  fetchRealData,
} from '@/lib/leaderboard';
import {
  DataSourceSelector,
  SimulationConfigComponent,
  CoefficientEditor,
  StatsDisplay,
  ContributorLeaderboard,
  ReviewerLeaderboard,
} from '@/components/leaderboard';

export default function AdminCalcPage() {
  const [dataSource, setDataSource] = useState<DataSourceType>('real');
  const [simulatedData, setSimulatedData] = useState<SimulatedData | null>(null);
  const [coefficients, setCoefficients] = useState<AllCoefficients>(DEFAULT_COEFFICIENTS);
  const [results, setResults] = useState<LeaderboardResults | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDataSourceChange = (source: DataSourceType) => {
    setDataSource(source);
    setResults(null); // Clear previous results
    setError(null);
  };

  const handleSimulationComplete = (data: SimulatedData) => {
    setSimulatedData(data);
    setResults(null); // Clear previous results
    setError(null);
  };

  const handleCalculate = async () => {
    setIsCalculating(true);
    setError(null);

    try {
      let inputData;

      if (dataSource === 'real') {
        // Fetch real data from database
        inputData = await fetchRealData();
      } else {
        // Use simulated data
        if (!simulatedData) {
          throw new Error('No simulated data available. Run simulation first.');
        }
        inputData = simulatedData;
      }

      // Calculate leaderboards client-side
      const calculatedResults = calculateLeaderboards(inputData, coefficients);
      setResults(calculatedResults);
    } catch (err) {
      console.error('Calculation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to calculate leaderboards');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleExportJSON = () => {
    if (!results) return;

    const filename = `leaderboard-${dataSource}-${new Date().toISOString().split('T')[0]}.json`;
    downloadResultsAsJSON(results, filename);
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
            Admin: Leaderboard Calculator
          </h1>
          <p className="text-gray-600">
            Experiment with scoring algorithms using real or simulated data. All calculations
            happen client-side.
          </p>
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

        {/* Simulation Config (if simulated data source selected) */}
        {dataSource === 'simulated' && (
          <div className="mb-6">
            <SimulationConfigComponent
              onSimulationComplete={handleSimulationComplete}
              simulatedData={simulatedData}
            />
          </div>
        )}

        {/* Section 2: Coefficient Configuration */}
        <div className="mb-6">
          <CoefficientEditor coefficients={coefficients} onChange={setCoefficients} />
        </div>

        {/* Section 3: Calculate Button */}
        <div className="mb-6 flex justify-center">
          <button
            onClick={handleCalculate}
            disabled={!canCalculate}
            className="px-8 py-3 bg-green-600 text-white text-lg rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg"
          >
            {isCalculating ? 'Calculating...' : '▶ Calculate Leaderboards'}
          </button>
        </div>

        {/* Section 4: Results */}
        {results && (
          <div className="space-y-6">
            {/* Stats */}
            <StatsDisplay stats={results.stats} />

            {/* Export Button */}
            <div className="flex justify-end">
              <button
                onClick={handleExportJSON}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Export JSON
              </button>
            </div>

            {/* Leaderboards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ContributorLeaderboard data={results.contributorLeaderboard} />
              <ReviewerLeaderboard data={results.reviewerLeaderboard} />
            </div>

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
                  <strong>Total Items:</strong> {results.stats.totalUsers} users,{' '}
                  {results.stats.totalPrompts} prompts, {results.stats.totalFeedbacks}{' '}
                  feedbacks
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
                : 'Click the Calculate button above to generate leaderboards'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
