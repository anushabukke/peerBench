import { DateTime } from "luxon";
import { BarChart3, Clock, CheckCircle, Zap, AlertCircle } from "lucide-react";
import { getLeaderboardItem } from "../../actions/get-leaderboard-item";
import { Card, CardContent } from "@/components/ui/card";

export interface StatsProps {
  modelName: string;
  promptSetId?: number;
  protocolAddress?: string;
}

export default async function Stats({
  modelName,
  promptSetId,
  protocolAddress,
}: StatsProps) {
  if (promptSetId === undefined && !protocolAddress) {
    return null;
  }

  const result = await getLeaderboardItem({
    model: modelName,
    promptSetId,
    protocolAddress,
  });

  // Handle potential errors from server action
  if (result.error) {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Error loading stats
              </h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                Failed to fetch leaderboard data. Please try again later.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats = result.data!;

  if (!stats) {
    return null;
  }

  const accuracyAvgScoreText =
    stats.accuracy !== null ? "Accuracy" : "Avg. Score";
  const accuracyAvgScoreValue =
    stats.accuracy !== null
      ? `${(stats.accuracy * 100).toFixed(2)}%`
      : stats.avgScore?.toFixed(2);
  const recentEvaluation = DateTime.fromJSDate(stats.recentEvaluation);
  const totalTestsPerformedText =
    stats.accuracy !== null ? "Total Prompts Sent" : "Total Tests Performed";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                {accuracyAvgScoreText}
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {accuracyAvgScoreValue}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Last Updated
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {recentEvaluation.toFormat("MMM DD")}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {recentEvaluation.toRelative()}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Total Evaluations
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {stats.totalEvaluations}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                {totalTestsPerformedText}
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {stats.totalTestsPerformed}
              </p>
            </div>
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/20 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
