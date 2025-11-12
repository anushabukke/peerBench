/**
 * Simulation Configuration Component
 *
 * Allows user to configure and run simulation of virtual users and feedbacks.
 */

"use client";

import { useState } from "react";
import type { SimulatedData } from "@/lib/leaderboard";
import type { SimpleSimulationConfig as SimulationConfig } from "@/sim/types";
import { DEFAULT_SIMPLE_SIMULATION_CONFIG as DEFAULT_SIMULATION_CONFIG } from "@/sim/types";
import { runSimpleSimulation } from "@/sim/client";

interface SimulationConfigProps {
  onSimulationComplete: (data: SimulatedData) => void;
  simulatedData: SimulatedData | null;
}

export function SimulationConfigComponent({
  onSimulationComplete,
  simulatedData,
}: SimulationConfigProps) {
  const [config, setConfig] = useState<SimulationConfig>(
    DEFAULT_SIMULATION_CONFIG
  );
  const [isRunning, setIsRunning] = useState(false);

  const handleRun = () => {
    setIsRunning(true);
    try {
      const data = runSimpleSimulation(config) as SimulatedData;
      onSimulationComplete(data);
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setConfig(DEFAULT_SIMULATION_CONFIG);
  };

  const updateConfig = <K extends keyof SimulationConfig>(
    key: K,
    value: SimulationConfig[K]
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const updatePersona = (
    persona: keyof SimulationConfig["personas"],
    value: number
  ) => {
    setConfig((prev) => ({
      ...prev,
      personas: { ...prev.personas, [persona]: value },
    }));
  };

  // Calculate total percentage
  const totalPercentage = Object.values(config.personas).reduce(
    (a, b) => a + b,
    0
  );
  const isPercentageValid = Math.abs(totalPercentage - 100) < 0.01;

  return (
    <div className="border rounded-lg p-6 bg-blue-50 shadow-sm space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Simulation Configuration</h3>
        <button
          onClick={handleReset}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Reset to Defaults
        </button>
      </div>

      {simulatedData && (
        <div className="bg-green-100 border border-green-300 rounded p-3 text-sm">
          <strong>Simulation Generated:</strong> {simulatedData.users.length}{" "}
          users, {simulatedData.prompts.length} prompts,{" "}
          {simulatedData.feedbacks.length} feedbacks
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Basic Config */}
        <div className="space-y-4">
          <h4 className="font-medium">Basic Settings</h4>

          <div>
            <label className="block text-sm font-medium mb-1">
              Number of Users
            </label>
            <input
              type="number"
              value={config.numUsers}
              onChange={(e) =>
                updateConfig("numUsers", parseInt(e.target.value) || 0)
              }
              min={1}
              max={500}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Prompts per User (min-max)
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                value={config.numPromptsPerUser.min}
                onChange={(e) =>
                  updateConfig("numPromptsPerUser", {
                    ...config.numPromptsPerUser,
                    min: parseInt(e.target.value) || 0,
                  })
                }
                min={0}
                className="w-1/2 border rounded px-3 py-2"
              />
              <input
                type="number"
                value={config.numPromptsPerUser.max}
                onChange={(e) =>
                  updateConfig("numPromptsPerUser", {
                    ...config.numPromptsPerUser,
                    max: parseInt(e.target.value) || 0,
                  })
                }
                min={config.numPromptsPerUser.min || 0}
                className="w-1/2 border rounded px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Good Prompts (%)
            </label>
            <input
              type="number"
              value={config.percentageGoodPrompts}
              onChange={(e) =>
                updateConfig(
                  "percentageGoodPrompts",
                  parseInt(e.target.value) || 0
                )
              }
              min={0}
              max={100}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Review Probability
            </label>
            <input
              type="number"
              step="0.1"
              value={config.probabilityReview}
              onChange={(e) =>
                updateConfig(
                  "probabilityReview",
                  parseFloat(e.target.value) || 0
                )
              }
              min={0}
              max={1}
              className="w-full border rounded px-3 py-2"
            />
            <div className="text-xs text-gray-600 mt-1">
              0-1, probability a user reviews a prompt
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Multiple Reviews Probability
            </label>
            <input
              type="number"
              step="0.1"
              value={config.probabilityMultipleReviews}
              onChange={(e) =>
                updateConfig(
                  "probabilityMultipleReviews",
                  parseFloat(e.target.value) || 0
                )
              }
              min={0}
              max={1}
              className="w-full border rounded px-3 py-2"
            />
            <div className="text-xs text-gray-600 mt-1">
              0-1, probability a prompt gets &gt;3 reviews
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Cabal Size</label>
            <input
              type="number"
              value={config.cabalSize}
              onChange={(e) =>
                updateConfig("cabalSize", parseInt(e.target.value) || 2)
              }
              min={2}
              max={20}
              className="w-full border rounded px-3 py-2"
            />
            <div className="text-xs text-gray-600 mt-1">
              Number of users per cabal group
            </div>
          </div>
        </div>

        {/* Persona Distribution */}
        <div className="space-y-4">
          <h4 className="font-medium">
            User Persona Distribution
            {!isPercentageValid && (
              <span className="text-red-600 text-sm ml-2">
                (Total: {totalPercentage}% - must equal 100%)
              </span>
            )}
          </h4>

          <div>
            <label className="block text-sm font-medium mb-1">
              Altruistic (%)
            </label>
            <input
              type="number"
              value={config.personas.altruistic}
              onChange={(e) =>
                updatePersona("altruistic", parseInt(e.target.value) || 0)
              }
              min={0}
              max={100}
              className="w-full border rounded px-3 py-2"
            />
            <div className="text-xs text-gray-600 mt-1">
              Honest reviews based on quality
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Greedy (%)</label>
            <input
              type="number"
              value={config.personas.greedy}
              onChange={(e) =>
                updatePersona("greedy", parseInt(e.target.value) || 0)
              }
              min={0}
              max={100}
              className="w-full border rounded px-3 py-2"
            />
            <div className="text-xs text-gray-600 mt-1">
              Only upvotes own prompts
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Cabal (%)</label>
            <input
              type="number"
              value={config.personas.cabal}
              onChange={(e) =>
                updatePersona("cabal", parseInt(e.target.value) || 0)
              }
              min={0}
              max={100}
              className="w-full border rounded px-3 py-2"
            />
            <div className="text-xs text-gray-600 mt-1">
              Groups that upvote each other
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Random (%)</label>
            <input
              type="number"
              value={config.personas.random}
              onChange={(e) =>
                updatePersona("random", parseInt(e.target.value) || 0)
              }
              min={0}
              max={100}
              className="w-full border rounded px-3 py-2"
            />
            <div className="text-xs text-gray-600 mt-1">Random opinions</div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Malicious (%)
            </label>
            <input
              type="number"
              value={config.personas.malicious}
              onChange={(e) =>
                updatePersona("malicious", parseInt(e.target.value) || 0)
              }
              min={0}
              max={100}
              className="w-full border rounded px-3 py-2"
            />
            <div className="text-xs text-gray-600 mt-1">
              Intentionally wrong reviews
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleRun}
          disabled={isRunning || !isPercentageValid}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isRunning
            ? "Running..."
            : simulatedData
              ? "Re-run Simulation"
              : "Run Simulation"}
        </button>
      </div>
    </div>
  );
}
