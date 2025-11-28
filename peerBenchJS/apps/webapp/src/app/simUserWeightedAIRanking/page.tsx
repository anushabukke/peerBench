import { SimulationLeaderboard } from "./components/simulation-leaderboard";
import { Filters } from "@/components/prompts-infinite-list/components/filters";

export default async function SimUserWeightedAIRankingPage() {
  return (
    <main className="flex flex-col items-center justify-center mx-auto px-4 py-8 max-w-7xl">
      <div className="w-full mb-8">
        <h1 className="text-3xl font-bold text-black dark:text-white mb-2">
          User-Weighted AI Ranking Simulation
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Test various user scoring algorithms and their impact on model leaderboards
        </p>
      </div>

      <SimulationLeaderboard />

      <Filters />
    </main>
  );
}
