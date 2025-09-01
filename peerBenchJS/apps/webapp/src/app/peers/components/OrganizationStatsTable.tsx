import { OrganizationStatsItem } from "@/services/stats.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Building2, Globe, Users, ExternalLink } from "lucide-react";
import * as motion from "motion/react-client";
import { formatNumber } from "@/utils/supabase/format-number";

const getRankIcon = (index: number) => {
  if (index === 0) return <Trophy className="w-5 h-5 text-yellow-500" />;
  if (index === 1) return <Trophy className="w-5 h-5 text-gray-400" />;
  if (index === 2) return <Trophy className="w-5 h-5 text-amber-600" />;
  return <span className="text-lg font-bold text-gray-500">{index + 1}</span>;
};

const formatOrgName = (name: string) => {
  if (name.length > 30) {
    return `${name.slice(0, 30)}...`;
  }
  return name;
};

const formatWebPageUrl = (url: string) => {
  if (!url) return '';
  // Ensure URL has protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
};

interface OrganizationStatsTableProps {
  organizations: OrganizationStatsItem[];
}

export function OrganizationStatsTable({ organizations }: OrganizationStatsTableProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Organization Statistics
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
                  Organization
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Members
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Prompts Uploaded
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Reviews Given
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Total Points
                </th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org, index) => (
                <motion.tr
                  key={org.id}
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
                        {formatOrgName(org.name)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        {org.country && (
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {org.country}
                          </span>
                        )}
                        {org.webPage && (
                          <a
                            href={formatWebPageUrl(org.webPage)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                          >
                            <span>Website</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">
                        {formatNumber(org.memberCount)}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-medium text-gray-900">
                      {formatNumber(org.totalPrompts)}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="space-y-1">
                      {org.totalPromptReviews > 0 && (
                        <div className="text-sm">
                          <span className="font-medium">
                            {formatNumber(org.totalPromptReviews)}
                          </span>{" "}
                          prompt reviews
                        </div>
                      )}
                      {org.totalTestReviews > 0 && (
                        <div
                          className={`text-sm ${
                            org.totalPromptReviews > 0 && "text-gray-500"
                          }`}
                        >
                          <span className="font-medium">
                            {formatNumber(org.totalTestReviews)}
                          </span>{" "}
                          test reviews
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div>
                      <div className="font-bold text-lg text-blue-600">
                        {formatNumber(org.totalPoints)}
                      </div>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {organizations.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center py-12"
          >
            <div className="w-24 h-24 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Organizations Yet
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              No organizations have contributed to the PeerBench network yet. 
              Organizations can join to collaborate and contribute prompts and reviews.
            </p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
