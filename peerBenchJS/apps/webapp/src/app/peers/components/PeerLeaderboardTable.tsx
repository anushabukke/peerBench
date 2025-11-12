import { PeerLeaderboardItem } from "@/services/stats.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, MessageSquare } from "lucide-react";
import * as motion from "motion/react-client";
import { formatNumber } from "@/utils/format-number";

const getRankIcon = (index: number) => {
  if (index === 0) return <Trophy className="w-5 h-5 text-yellow-500" />;
  if (index === 1) return <Trophy className="w-5 h-5 text-gray-400" />;
  if (index === 2) return <Trophy className="w-5 h-5 text-amber-600" />;
  return <span className="text-lg font-bold text-gray-500">{index + 1}</span>;
};

const formatUserId = (id: string) => {
  return `${id.slice(0, 8)}...`;
};

interface PeerLeaderboardTableProps {
  peers: PeerLeaderboardItem[];
}

export function PeerLeaderboardTable({ peers }: PeerLeaderboardTableProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Peer Review Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Rank
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Peer
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Reviews
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Total Contributions
                </th>
              </tr>
            </thead>
            <tbody>
              {peers.map((peer, index) => (
                <motion.tr
                  key={peer.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-center w-8 h-8">
                      {getRankIcon(index)}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div>
                      <div className="font-medium text-gray-900">
                        {formatUserId(peer.id)}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="space-y-1">
                      {peer.totalTestReviews > 0 && (
                        <div className={`text-sm`}>
                          <span className="font-medium">
                            {formatNumber(peer.totalTestReviews)}
                          </span>{" "}
                          result reviews
                        </div>
                      )}
                      {peer.totalPromptReviews > 0 && (
                        <div
                          className={`text-sm ${
                            peer.totalTestReviews > 0 && "text-gray-500"
                          }`}
                        >
                          <span className="font-medium">
                            {formatNumber(peer.totalPromptReviews)}
                          </span>{" "}
                          prompt reviews
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div>
                      <div className={`font-bold text-lg`}>
                        {formatNumber(peer.totalContributions)}
                      </div>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {peers.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center py-12"
          >
            <div className="w-24 h-24 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Peers Yet
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Be the first to contribute to the PeerBench network! Start
              reviewing test results and prompts, or answering questions to
              climb the leaderboard.
            </p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
