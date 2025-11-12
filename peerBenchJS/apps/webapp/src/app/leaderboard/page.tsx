import { getUser } from "@/lib/actions/auth";
import { LeaderboardTable } from "./components/leaderboard-table";
import { LeaderboardService } from "@/services/leaderboard.service";
import { NULL_UUID } from "@/lib/constants";

export default async function LeaderboardPage() {
  // const { leaderboards, status, error } = useSelector(
  //   (state: RootState) => state.leaderboardSlice
  // );

  // if (status === "loading") {
  //   return <LoadingPage />;
  // }

  // if (status === "failed") {
  //   toast.error(error);
  //   return (<div>Error: {error}</div> *link go back*)
  // }

  const user = await getUser();

  // Fetch data directly on the server
  const leaderboards = await LeaderboardService.getLeaderboards({
    requestedByUserId: user?.id ?? NULL_UUID,
  });

  if (leaderboards.length === 0) {
    return (
      <div className="w-full text-2xl text-center text-gray-500 dark:text-gray-400 py-4">
        No leaderboards available.
      </div>
    );
  }

  // The leaderboard that has the most recent test entry, will be at the top
  const sortedLeaderboards = leaderboards
    .sort((a, b) => {
      // Get the most recent entry from each leaderboard
      const aMostRecentRun = Math.max(
        ...a.entries.map((entry) => entry.recentEvaluation.getTime())
      );
      const bMostRecentRun = Math.max(
        ...b.entries.map((entry) => entry.recentEvaluation.getTime())
      );

      return bMostRecentRun - aMostRecentRun;
    })
    .sort((a, b) => {
      return a.promptType?.localeCompare(b.promptType || "") || 0;
    });

  return (
    <>
      <div className="flex flex-col gap-1 mb-3">
        <h1 className="text-2xl font-semibold">Model Leaderboard</h1>
        <p className="text-sm text-gray-500">
          Here you can find the leaderboards for the Benchmarks and compare
          which model performed best on each Benchmark and type
        </p>
      </div>
      {sortedLeaderboards.map((leaderboard) => (
        <LeaderboardTable key={leaderboard.context} data={leaderboard} />
      ))}
    </>
  );
}
