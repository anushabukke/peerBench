import { PeerLeaderboardStats } from "./components/PeerLeaderboardStats";
import { ValidatorLeaderboardStats } from "./components/ValidatorLeaderboardStats";
import { ValidatorLeaderboardTable } from "./components/ValidatorLeaderboardTable";
import { PeerLeaderboardTable } from "./components/PeerLeaderboardTable";
import { OrganizationStats } from "./components/OrganizationStats";
import { OrganizationStatsTable } from "./components/OrganizationStatsTable";
import { StatsService } from "@/services/stats.service";

export default async function PeersPage() {
  // Fetch data directly on the server
  const [leaderboard, validatorStats, organizationStats] =
    await Promise.allSettled([
      StatsService.getPeerLeaderboard(),
      StatsService.getValidatorLeaderboard(),
      StatsService.getOrganizationStats(),
    ]);

  // Handle each response individually to avoid partial failures
  const leaderboardData =
    leaderboard.status === "fulfilled"
      ? leaderboard.value
      : { peers: [], totalPeers: 0, lastUpdated: new Date() };

  const validatorStatsData =
    validatorStats.status === "fulfilled"
      ? validatorStats.value
      : { validators: [], totalValidators: 0, lastUpdated: new Date() };

  const organizationStatsData =
    organizationStats.status === "fulfilled"
      ? organizationStats.value
      : { organizations: [], totalOrganizations: 0, lastUpdated: new Date() };

  return (
    <div className="container flex flex-col mx-auto px-4 pb-10">
      <div className="mt-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Validator Quality Leaderboard
            </h2>
            <p className="text-gray-600">
              Validators ranked by peer review metrics
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-12">
          <ValidatorLeaderboardStats leaderboard={validatorStatsData} />
          <ValidatorLeaderboardTable
            validators={validatorStatsData?.validators || []}
          />
        </div>
      </div>

      {/* Peer Review Leaderboard Section */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Peer Review Leaderboard
            </h2>
            <p className="text-gray-600">
              Top reviewers ranked by their impact
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-12">
          <PeerLeaderboardStats leaderboard={leaderboardData} />
          <PeerLeaderboardTable peers={leaderboardData?.peers || []} />
        </div>
      </div>

      {/* Organization Statistics Section */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Organization Statistics
            </h2>
            <p className="text-gray-600">
              Organizations ranked by their contributions and impact
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-12">
          <OrganizationStats stats={organizationStatsData} />
          <OrganizationStatsTable
            organizations={organizationStatsData?.organizations || []}
          />
        </div>
      </div>
    </div>
  );
}
