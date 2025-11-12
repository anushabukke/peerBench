import { ValidatorLeaderboardItem } from "@/services/stats.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, TrendingUp, Clock } from "lucide-react";
import * as motion from "motion/react-client";
import { formatNumber } from "@/utils/format-number";

const getRankIcon = (index: number) => {
  if (index === 0) return <Trophy className="w-5 h-5 text-yellow-500" />;
  if (index === 1) return <Trophy className="w-5 h-5 text-gray-400" />;
  if (index === 2) return <Trophy className="w-5 h-5 text-amber-600" />;
  return <span className="text-lg font-bold text-gray-500">{index + 1}</span>;
};

const getQualityColor = (score: number) => {
  if (score >= 0.8) return "text-green-500";
  if (score >= 0.6) return "text-yellow-500";
  return "text-red-500";
};

const getCoverageColor = (coverage: number) => {
  if (coverage >= 0.8) return "text-green-500";
  if (coverage >= 0.5) return "text-yellow-500";
  return "text-red-500";
};

const formatUserId = (id: string) => {
  return `${id.slice(0, 8)}...`;
};

interface ValidatorLeaderboardTableProps {
  validators: ValidatorLeaderboardItem[];
}

export function ValidatorLeaderboardTable({
  validators,
}: ValidatorLeaderboardTableProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Validator Quality Leaderboard
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
                  Validator
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Uploads
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Review Coverage
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Quality Score
                </th>
              </tr>
            </thead>
            <tbody>
              {validators.map((validator, index) => {
                const reviewCoverage =
                  (validator.totalPromptReviews /
                    validator.totalUploadedPrompts) *
                  100;
                const totalReviews = validator.totalPromptReviews;
                const positivePercentage =
                  totalReviews > 0
                    ? (validator.positivePromptReviews / totalReviews) * 100
                    : 0;
                const negativePercentage =
                  totalReviews > 0
                    ? (validator.negativePromptReviews / totalReviews) * 100
                    : 0;

                return (
                  <motion.tr
                    key={validator.id}
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
                          {formatUserId(validator.id)}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <div className="text-sm">
                          <span className="font-medium">
                            {formatNumber(validator.totalUploadedPrompts)}
                          </span>{" "}
                          prompts
                        </div>
                        <div className="text-xs text-gray-500">
                          from {formatNumber(validator.totalPromptSets)} prompt
                          set
                          {validator.totalPromptSets > 1 ? "s" : ""}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="">
                        <div
                          className={`font-bold text-lg ${getCoverageColor(
                            reviewCoverage
                          )}`}
                        >
                          {reviewCoverage.toFixed(2)}%
                        </div>
                        <div className="text-xs text-gray-500">
                          {validator.unreviewedPrompts > 0 && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatNumber(validator.unreviewedPrompts)}{" "}
                              pending (
                              {(
                                (validator.unreviewedPrompts /
                                  validator.totalUploadedPrompts) *
                                100
                              ).toFixed(2)}
                              %)
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <div
                          className={`font-bold text-lg ${getQualityColor(validator.promptsQualityScore)}`}
                        >
                          {validator.promptsQualityScore.toFixed(2)}%
                        </div>
                        <div className="text-xs text-gray-500">
                          <span className="text-green-600 font-medium">
                            +{formatNumber(validator.positivePromptReviews)}
                          </span>{" "}
                          ({positivePercentage.toFixed(2)}%) positive
                          {validator.negativePromptReviews > 0 && (
                            <>
                              <br />
                              <span className="text-red-600 font-medium">
                                -{formatNumber(validator.negativePromptReviews)}
                              </span>{" "}
                              ({negativePercentage.toFixed(2)}%) negative
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {validators.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center py-12"
          >
            <div className="w-24 h-24 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <TrendingUp className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Validators Yet
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              No validators have uploaded prompts yet. Be the first to
              contribute high-quality prompts to the peerBench!
            </p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
