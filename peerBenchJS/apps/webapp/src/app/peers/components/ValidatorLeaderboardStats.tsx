import * as motion from "motion/react-client";
import { Card, CardContent } from "@/components/ui/card";
import { ValidatorLeaderboard } from "@/services/stats.service";
import { Shield, FileText, Star, Activity } from "lucide-react";
// import { DateTime } from "luxon";
import { formatNumber } from "@/utils/format-number";

interface ValidatorLeaderboardStatsProps {
  leaderboard: ValidatorLeaderboard;
}

export function ValidatorLeaderboardStats({
  leaderboard,
}: ValidatorLeaderboardStatsProps) {
  // Handle null/undefined leaderboard data
  if (!leaderboard || !leaderboard.validators) {
    return null;
  }

  const totalUploadedPrompts = leaderboard.validators.reduce(
    (sum, validator) => sum + validator.totalUploadedPrompts,
    0
  );

  const avgQualityScore =
    leaderboard.validators.length > 0
      ? leaderboard.validators.reduce(
          (sum, validator) => sum + validator.promptsQualityScore,
          0
        ) / leaderboard.validators.length
      : 0;

  // const activeValidators = leaderboard.validators.filter((validator) => {
  //   return (
  //     validator.recentActivity &&
  //     DateTime.fromJSDate(new Date(validator.recentActivity))
  //       .diffNow()
  //       .as("days") > -7
  //   );
  // }).length;

  const stats = [
    {
      title: "Total Validators",
      value: formatNumber(leaderboard.totalValidators),
      icon: Shield,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
      description: "Validators that have uploaded prompts",
    },
    {
      title: "Prompts Uploaded",
      value: formatNumber(totalUploadedPrompts),
      icon: FileText,
      color: "text-violet-600",
      bgColor: "bg-violet-100",
      description: "Total prompts uploaded",
    },
    {
      title: "Quality Rating",
      value: `${avgQualityScore.toFixed(2)}%`,
      icon: Star,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
      description: "Average quality score across all prompts",
    },
    {
      title: "Recent Activity",

      // TODO: Hardcode for the time being
      value: 2, // `${formatNumber(activeValidators)} Validators`,
      icon: Activity,
      color: "text-sky-600",
      bgColor: "bg-sky-100",
      description: "Active this week",
    },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
    </div>
  );
}
