import { OrganizationStats as OrganizationStatsType } from "@/services/stats.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  Users,
  Upload,
  /*  MessageSquare, */ Trophy,
} from "lucide-react";
import { formatNumber } from "@/utils/supabase/format-number";

interface OrganizationStatsProps {
  stats: OrganizationStatsType | null;
}

export function OrganizationStats({ stats }: OrganizationStatsProps) {
  if (!stats) return null;

  const totalPrompts = stats.organizations.reduce(
    (sum, org) => sum + org.totalPrompts,
    0
  );
  // const totalReviews = stats.organizations.reduce(
  //   (sum, org) => sum + org.totalPromptReviews + org.totalTestReviews,
  //   0
  // );
  const totalPoints = stats.organizations.reduce(
    (sum, org) => sum + org.totalPoints,
    0
  );
  const totalMembers = stats.organizations.reduce(
    (sum, org) => sum + org.memberCount,
    0
  );

  const statsItems = [
    {
      title: "Total Organizations",
      value: stats.totalOrganizations,
      icon: Building2,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Total Members",
      value: totalMembers,
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Prompts Uploaded",
      value: totalPrompts,
      icon: Upload,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Total Points",
      value: totalPoints,
      icon: Trophy,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsItems.map((item, index) => (
        <Card key={index} className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {item.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${item.bgColor}`}>
              <item.icon className={`w-4 h-4 ${item.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${item.color}`}>
              {formatNumber(item.value)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {item.title === "Total Points" && "Combined reviews"}
              {item.title === "Prompts Uploaded" && "Across all orgs"}
              {item.title === "Total Members" && "Active contributors"}
              {item.title === "Total Organizations" && "Participating orgs"}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
