import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getUser } from "@/lib/actions/auth";
import { PromptSetService } from "@/services/promptset.service";
import {
  LucideUsers,
  LucideFileText,
  LucideBarChart3,
  LucideTag,
  LucideShield,
  LucideGlobe,
  LucidePen,
  LucideHash,
  LucideUser,
  LucideBuilding2,
  LucideClipboardCheck,
  LucidePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import PromptsInfiniteList from "@/components/prompts-infinite-list";
import { NULL_UUID } from "@/lib/constants";
import { LeaderboardTable } from "./components/leaderboard-table";
import { DownloadPromptsButton } from "./components/download-prompts-button";
import { NotFound } from "./_not-found";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getUser();
  const promptSetId = await params.then((p) => parseInt(p.id));
  const promptSet = await PromptSetService.getPromptSet({
    filters: {
      id: promptSetId,
    },
    requestedByUserId: user?.id ?? NULL_UUID, // Still apply access control rules
  });

  if (!promptSet) {
    return <NotFound />;
  }

  // TODO: We can use `CoauthorsTable` component here instead fetching the co-author list on the server side
  // Get the list of contributors
  const contributorsResult = await PromptSetService.getCoAuthors({
    promptSetId: promptSetId,
    requestedByUserId: user?.id ?? NULL_UUID,
    page: 1,
    pageSize: 100, // Get all contributors
  });

  // Fetch leaderboard data for this prompt set from scores table
  const leaderboardData = await PromptSetService.getPromptSetLeaderboard({
    promptSetId: promptSetId,
    requestedByUserId: user?.id ?? NULL_UUID,
  });

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="space-y-8">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {promptSet.title}
                </h1>
                {promptSet.isPublic && (
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  >
                    <LucideGlobe className="h-3 w-3" />
                    Public
                  </Badge>
                )}
                <div className="flex-1" />
                <div className="flex gap-2">
                  {(promptSet.totalPromptsCount ?? 0) > 0 && (
                    <Button
                      asChild
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 h-auto"
                      size="lg"
                    >
                      <Link
                        href={`/prompts/review?promptSetId=${promptSet.id}`}
                      >
                        <LucideClipboardCheck size={20} className="mr-2" />
                        Review Prompts
                      </Link>
                    </Button>
                  )}
                  {(promptSet.permissions?.canEdit ||
                    promptSet.isPublicSubmissionsAllowed) && (
                    <Button
                      asChild
                      variant="outline"
                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      <Link
                        href={`/prompts/create?promptSetId=${promptSet.id}`}
                      >
                        <LucidePlus size={16} className="mr-1" />
                        Add Prompts
                      </Link>
                    </Button>
                  )}
                  {promptSet.permissions?.canEdit && (
                    <Button asChild variant="outline">
                      <Link href={`/prompt-sets/view/${promptSet.id}/edit`}>
                        <LucidePen size={16} />
                        Edit
                      </Link>
                    </Button>
                  )}
                </div>
              </div>

              {promptSet.description && (
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {promptSet.description}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <LucideTag className="h-3 w-3" />
                  {promptSet.category || "Default"}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <LucideShield className="h-3 w-3" />
                  {promptSet.license || "CC BY 4.0"}
                </Badge>
                {promptSet.isPublicSubmissionsAllowed && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <LucideUsers className="h-3 w-3" />
                    Public Submissions
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Hero Footer */}
          <div className="border-t border-box-border mt-8 pt-4">
            {promptSet.tags && promptSet.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <p className="text-xs text-slate-600">Tags</p>
                {promptSet.tags.map((tag, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
        {promptSet.citationInfo && (
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle>Citation Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {promptSet.citationInfo}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <LucideFileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {promptSet.totalPromptsCount || 0}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Total Prompts
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                  <LucideBarChart3 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {promptSet.totalScoreCount || 0}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Scored Responses
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <LucideUsers className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {contributorsResult.data.length}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Contributors
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                  <LucideBarChart3 className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {promptSet.averageScore?.toFixed(1)}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Avg Score
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Model Leaderboard
          </h2>
          <LeaderboardTable
            data={leaderboardData}
            totalPromptsInSet={promptSet.totalPromptsCount || 0}
          />
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 p-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Collaborators list
                </h2>
              </div>
              <ul className="[&>*:last-child]:border-b-0">
                {contributorsResult.data.map((contributor) => (
                  <li
                    key={contributor.userId}
                    className="text-lg text-slate-600 break-all border-b py-3 hover:opacity-75 duration-100"
                  >
                    <Link href={`/profile/${contributor.userId}`}>
                      <div className="text-lg font-semibold text-gray-700 flex items-center gap-2 mb-1 flex-wrap">
                        <p>
                          {contributor.displayName ||
                            (contributor.email
                              ? contributor.email.substring(0, 3) +
                                "***" +
                                contributor.email.substring(
                                  contributor.email.indexOf("@")
                                )
                              : null) ||
                            "Unknown User"}
                        </p>
                        <Badge
                          variant="secondary"
                          className={`flex items-center gap-1 ${
                            contributor.role === "owner"
                              ? "bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400"
                              : contributor.role === "admin"
                                ? "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400"
                                : contributor.role === "collaborator"
                                  ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
                                  : contributor.role === "reviewer"
                                    ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400"
                                    : "bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          <LucideUser className="h-3 w-3" />
                          {contributor.role || "Contributor"}
                        </Badge>
                        {contributor.orgName && (
                          <Badge
                            variant="secondary"
                            className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400"
                          >
                            <LucideBuilding2 className="h-3 w-3" />
                            {contributor.orgName}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm flex items-center gap-2 text-gray-500">
                        <LucideHash className="w-4 h-4" />
                        {contributor.userId}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Download Button Section */}
        <div className="flex justify-end">
          <DownloadPromptsButton
            promptSetId={promptSet.id}
            promptSetTitle={promptSet.title}
            userId={user?.id}
          />
        </div>

        <PromptsInfiniteList
          isUserLoggedIn={Boolean(user)}
          fixedFilters={{ promptSetId: promptSet.id }}
          canManagePromptStatus={promptSet.permissions?.canEdit}
        />
      </div>
    </main>
  );
}
