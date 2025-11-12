import * as motion from "motion/react-client";
import { Card, CardContent } from "@/components/ui/card";
import { PeerLeaderboard } from "@/services/stats.service";
import { Users, TrendingUp, Activity } from "lucide-react";
// import { DateTime } from "luxon";
import { formatNumber } from "@/utils/format-number";

interface PeerLeaderboardStatsProps {
  leaderboard: PeerLeaderboard;
}

export function PeerLeaderboardStats({
  leaderboard,
}: PeerLeaderboardStatsProps) {
  // Handle null/undefined leaderboard data
  if (!leaderboard || !leaderboard.peers) {
    return null;
  }

  const totalContributions = leaderboard.peers.reduce(
    (sum, peer) => sum + peer.totalPromptReviews + peer.totalTestReviews,
    0
  );

  // const activePeers = leaderboard.peers.filter((peer) => {
  //   return (
  //     peer.recentActivity &&
  //     DateTime.fromJSDate(new Date(peer.recentActivity)).diffNow().as("days") >
  //       -7
  //   );
  // }).length;
  // const topContributor = leaderboard.peers[0];

  const stats = [
    {
      title: "Total Peers",
      value: formatNumber(leaderboard.totalPeers),
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      description: "Peers who performed reviews",
    },
    {
      title: "Total Contributions",
      value: formatNumber(totalContributions),
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-100",
      description: "Prompt & Result reviews",
    },
    {
      title: "Recent Activity",
      value: 3, //`${formatNumber(activePeers)} Peers`,
      icon: Activity,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      description: "Active this week",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              delay: index * 0.1,
              type: "spring",
              stiffness: 100,
            }}
          >
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {stat.description}
                    </p>
                  </div>
                  <div
                    className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}
                  >
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Top Contributor Highlight */}
      {/* {topContributor && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="border-0 shadow-xl bg-gradient-to-r from-yellow-50 to-amber-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    🏆
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Top Contributor
                    </h3>
                    <p className="text-gray-600">
                      {topContributor.email.split("@")[0]}@
                      {topContributor.email.split("@")[1]}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>
                        Score: {topContributor.contributionScore.toFixed(0)}
                      </span>
                      <span>
                        Accuracy: {(topContributor.accuracy * 100).toFixed(1)}%
                      </span>
                      <span>{topContributor.badges.length} badges</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Last Updated</div>
                  <div className="text-sm font-medium text-gray-900">
                    {DateTime.fromJSDate(leaderboard.lastUpdated).toFormat(
                      "MMM dd, HH:mm"
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )} */}
    </div>
  );
}
