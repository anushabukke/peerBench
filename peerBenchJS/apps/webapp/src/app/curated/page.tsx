import { getUser } from "@/lib/actions/auth";
import { CuratedLeaderboardView } from "./components/curated-leaderboard-view";

export default async function CuratedPage() {
  const user = await getUser();

  return (
    <main className="flex flex-col items-center justify-center mx-auto px-4 py-8 max-w-7xl">
      <div className="w-full mb-8">
        <h1 className="text-3xl font-bold text-black dark:text-white mb-2">
          Curated Leaderboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Explore model performance with custom filters
        </p>
      </div>

      <CuratedLeaderboardView
        className="w-full"
        isUserLoggedIn={user !== undefined}
      />
    </main>
  );
}
