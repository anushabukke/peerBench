"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

interface Route {
  path: string;
  type: "page" | "api";
  method?: string;
  isDynamic: boolean;
  category: string;
}

const PAGE_ROUTES: Route[] = [
  // Main routes
  { path: "/", type: "page", isDynamic: false, category: "Main" },
  { path: "/login", type: "page", isDynamic: false, category: "Auth" },
  { path: "/signup", type: "page", isDynamic: false, category: "Auth" },
  { path: "/signup/confirm/[code]", type: "page", isDynamic: true, category: "Auth" },
  { path: "/forgot-password", type: "page", isDynamic: false, category: "Auth" },
  { path: "/reset-password", type: "page", isDynamic: false, category: "Auth" },

  // User routes
  { path: "/dashboard", type: "page", isDynamic: false, category: "User" },
  { path: "/profile", type: "page", isDynamic: false, category: "User" },
  { path: "/profile/[userId]", type: "page", isDynamic: true, category: "User" },
  { path: "/settings", type: "page", isDynamic: false, category: "User" },
  { path: "/peers", type: "page", isDynamic: false, category: "User" },

  // Benchmark routes
  { path: "/benchmark", type: "page", isDynamic: false, category: "Benchmark" },
  { path: "/compare", type: "page", isDynamic: false, category: "Benchmark" },
  { path: "/compare/share/[id]", type: "page", isDynamic: true, category: "Benchmark" },
  { path: "/leaderboard", type: "page", isDynamic: false, category: "Benchmark" },
  { path: "/leaderboard/details/[modelName]", type: "page", isDynamic: true, category: "Benchmark" },
  { path: "/curated", type: "page", isDynamic: false, category: "Benchmark" },

  // Prompt routes
  { path: "/prompts", type: "page", isDynamic: false, category: "Prompts" },
  { path: "/prompts/[id]", type: "page", isDynamic: true, category: "Prompts" },
  { path: "/prompts/create", type: "page", isDynamic: false, category: "Prompts" },
  { path: "/prompts/review", type: "page", isDynamic: false, category: "Prompts" },

  // Prompt Set routes
  { path: "/prompt-sets", type: "page", isDynamic: false, category: "Prompt Sets" },
  { path: "/prompt-sets/create", type: "page", isDynamic: false, category: "Prompt Sets" },
  { path: "/prompt-sets/view/[id]", type: "page", isDynamic: true, category: "Prompt Sets" },
  { path: "/prompt-sets/view/[id]/edit", type: "page", isDynamic: true, category: "Prompt Sets" },
  { path: "/prompt-sets/invite/[code]", type: "page", isDynamic: true, category: "Prompt Sets" },

  // Upload & Inspect
  { path: "/upload", type: "page", isDynamic: false, category: "Data" },
  { path: "/inspect", type: "page", isDynamic: false, category: "Data" },
  { path: "/inspect/[cid]", type: "page", isDynamic: true, category: "Data" },
  { path: "/supporting-documents", type: "page", isDynamic: false, category: "Data" },

  // Stats & Admin
  { path: "/stats", type: "page", isDynamic: false, category: "Stats" },
  { path: "/admin", type: "page", isDynamic: false, category: "Admin" },
  { path: "/adminCalc", type: "page", isDynamic: false, category: "Admin" },
  { path: "/adminSimulate", type: "page", isDynamic: false, category: "Admin" },
  { path: "/beta_scores002", type: "page", isDynamic: false, category: "Admin" },
];

const API_ROUTES: Route[] = [
  // Admin APIs
  { path: "/api/admin/signups", type: "api", method: "GET", isDynamic: false, category: "Admin" },
  { path: "/api/admin/users", type: "api", method: "GET", isDynamic: false, category: "Admin" },
  { path: "/api/v2/admin/simulate/run", type: "api", method: "POST", isDynamic: false, category: "Admin" },

  // Auth APIs
  { path: "/api/v1/auth/reset-password", type: "api", method: "POST", isDynamic: false, category: "Auth" },

  // User & Profile APIs
  { path: "/api/v1/user", type: "api", method: "GET", isDynamic: false, category: "User" },
  { path: "/api/v1/user/profile", type: "api", method: "GET/PUT", isDynamic: false, category: "User" },
  { path: "/api/v1/profile", type: "api", method: "GET/POST", isDynamic: false, category: "User" },
  { path: "/api/v2/profile", type: "api", method: "GET/PUT", isDynamic: false, category: "User" },
  { path: "/api/v2/profile/keys/[provider]", type: "api", method: "GET/POST/DELETE", isDynamic: true, category: "User" },

  // Prompt APIs
  { path: "/api/v2/prompts", type: "api", method: "GET/POST", isDynamic: false, category: "Prompts" },
  { path: "/api/v2/prompts/[id]/assignable-prompt-sets", type: "api", method: "GET", isDynamic: true, category: "Prompts" },
  { path: "/api/v2/prompts/[id]/comments", type: "api", method: "GET/POST", isDynamic: true, category: "Prompts" },
  { path: "/api/v2/prompts/[id]/comments/[commentId]/replies", type: "api", method: "GET/POST", isDynamic: true, category: "Prompts" },
  { path: "/api/v2/prompts/[id]/quick-feedback", type: "api", method: "POST", isDynamic: true, category: "Prompts" },
  { path: "/api/v2/prompts/check-by-hash", type: "api", method: "POST", isDynamic: false, category: "Prompts" },
  { path: "/api/v1/filters/prompts", type: "api", method: "GET", isDynamic: false, category: "Prompts" },

  // Prompt Set APIs
  { path: "/api/v2/prompt-sets", type: "api", method: "GET/POST", isDynamic: false, category: "Prompt Sets" },
  { path: "/api/v2/prompt-sets/[id]", type: "api", method: "GET/PUT/DELETE", isDynamic: true, category: "Prompt Sets" },
  { path: "/api/v2/prompt-sets/[id]/coauthors", type: "api", method: "GET/POST", isDynamic: true, category: "Prompt Sets" },
  { path: "/api/v2/prompt-sets/[id]/coauthors/[coAuthorUserId]", type: "api", method: "DELETE", isDynamic: true, category: "Prompt Sets" },
  { path: "/api/v2/prompt-sets/[id]/invitations", type: "api", method: "GET/POST", isDynamic: true, category: "Prompt Sets" },
  { path: "/api/v2/prompt-sets/[id]/prompts/[promptId]", type: "api", method: "PUT/DELETE", isDynamic: true, category: "Prompt Sets" },
  { path: "/api/v2/prompt-sets/[id]/prompts/assign", type: "api", method: "POST", isDynamic: true, category: "Prompt Sets" },
  { path: "/api/v2/prompt-sets/invite", type: "api", method: "POST", isDynamic: false, category: "Prompt Sets" },
  { path: "/api/v1/data/prompt-set/categories", type: "api", method: "GET", isDynamic: false, category: "Prompt Sets" },
  { path: "/api/v1/data/prompt-set/tags", type: "api", method: "GET", isDynamic: false, category: "Prompt Sets" },

  // Response APIs
  { path: "/api/v2/responses", type: "api", method: "GET/POST", isDynamic: false, category: "Responses" },
  { path: "/api/v2/responses/[responseId]/comments", type: "api", method: "GET/POST", isDynamic: true, category: "Responses" },
  { path: "/api/v2/responses/[responseId]/comments/[commentId]/replies", type: "api", method: "GET/POST", isDynamic: true, category: "Responses" },
  { path: "/api/v2/responses/[responseId]/quick-feedback", type: "api", method: "POST", isDynamic: true, category: "Responses" },

  // Score APIs
  { path: "/api/v1/scores", type: "api", method: "POST", isDynamic: false, category: "Scores" },
  { path: "/api/v2/scores", type: "api", method: "GET/POST", isDynamic: false, category: "Scores" },
  { path: "/api/v2/scores/[scoreId]/comments", type: "api", method: "GET/POST", isDynamic: true, category: "Scores" },
  { path: "/api/v2/scores/[scoreId]/comments/[commentId]/replies", type: "api", method: "GET/POST", isDynamic: true, category: "Scores" },
  { path: "/api/v2/scores/[scoreId]/quick-feedback", type: "api", method: "POST", isDynamic: true, category: "Scores" },

  // Model APIs
  { path: "/api/v2/models/[provider]", type: "api", method: "GET", isDynamic: true, category: "Models" },
  { path: "/api/v2/models/random", type: "api", method: "GET", isDynamic: false, category: "Models" },
  { path: "/api/v2/model-matches", type: "api", method: "GET/POST", isDynamic: false, category: "Models" },
  { path: "/api/v2/model-matches/[id]", type: "api", method: "GET", isDynamic: true, category: "Models" },
  { path: "/api/v2/model-matches/[id]/share", type: "api", method: "POST", isDynamic: true, category: "Models" },

  // Stats & Leaderboard APIs
  { path: "/api/v1/stats/organization-stats", type: "api", method: "GET", isDynamic: false, category: "Stats" },
  { path: "/api/v1/stats/peer-leaderboard", type: "api", method: "GET", isDynamic: false, category: "Stats" },
  { path: "/api/v1/stats/validator-leaderboard", type: "api", method: "GET", isDynamic: false, category: "Stats" },
  { path: "/api/v2/stats/activity", type: "api", method: "GET", isDynamic: false, category: "Stats" },
  { path: "/api/v2/stats/user-registrations", type: "api", method: "GET", isDynamic: false, category: "Stats" },
  { path: "/api/v2/stats/users", type: "api", method: "GET", isDynamic: false, category: "Stats" },
  { path: "/api/v2/leaderboard/curated", type: "api", method: "GET", isDynamic: false, category: "Stats" },

  // File & Data APIs
  { path: "/api/v1/files", type: "api", method: "POST", isDynamic: false, category: "Files" },
  { path: "/api/files/[cid]", type: "api", method: "GET", isDynamic: true, category: "Files" },
  { path: "/api/files/[cid]/download", type: "api", method: "GET", isDynamic: true, category: "Files" },
  { path: "/api/v2/hashes", type: "api", method: "POST", isDynamic: false, category: "Files" },
  { path: "/api/evaluations", type: "api", method: "POST", isDynamic: false, category: "Files" },

  // Supporting Documents APIs
  { path: "/api/supporting-documents", type: "api", method: "GET/POST", isDynamic: false, category: "Documents" },
  { path: "/api/supporting-documents/[id]", type: "api", method: "GET/PUT/DELETE", isDynamic: true, category: "Documents" },
  { path: "/api/supporting-documents/[id]/prompt-sets", type: "api", method: "GET", isDynamic: true, category: "Documents" },

  // Review APIs
  { path: "/api/v1/review", type: "api", method: "POST", isDynamic: false, category: "Reviews" },
  { path: "/api/v1/reviews", type: "api", method: "GET", isDynamic: false, category: "Reviews" },

  // Test Results
  { path: "/api/v1/test-results", type: "api", method: "POST", isDynamic: false, category: "Testing" },

  // Validation Sessions
  { path: "/api/validation-sessions/list", type: "api", method: "GET", isDynamic: false, category: "Validation" },
  { path: "/api/validation-sessions/upload", type: "api", method: "POST", isDynamic: false, category: "Validation" },
  { path: "/api/validation-sessions/files/[cid]", type: "api", method: "GET", isDynamic: true, category: "Validation" },

  // Organization APIs
  { path: "/api/v1/orgs/lookup", type: "api", method: "GET", isDynamic: false, category: "Organizations" },

  // Data Filters
  { path: "/api/v1/data/filters/prompt-set", type: "api", method: "GET", isDynamic: false, category: "Filters" },
  { path: "/api/v1/data/filters/prompt-tag", type: "api", method: "GET", isDynamic: false, category: "Filters" },

  // Cron
  { path: "/api/internal/cron/refresh-openrouter-models", type: "api", method: "POST", isDynamic: false, category: "Internal" },
];

export function RoutesDirectory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const allRoutes = useMemo(() => [...PAGE_ROUTES, ...API_ROUTES], []);

  const filteredRoutes = useMemo(() => {
    let routes = allRoutes;

    // Filter by type
    if (activeTab === "pages") {
      routes = routes.filter((r) => r.type === "page");
    } else if (activeTab === "api") {
      routes = routes.filter((r) => r.type === "api");
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      routes = routes.filter(
        (r) =>
          r.path.toLowerCase().includes(query) ||
          r.category.toLowerCase().includes(query)
      );
    }

    return routes;
  }, [allRoutes, activeTab, searchQuery]);

  const groupedRoutes = useMemo(() => {
    const grouped = new Map<string, Route[]>();
    filteredRoutes.forEach((route) => {
      const category = route.category;
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(route);
    });
    return Array.from(grouped.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
  }, [filteredRoutes]);

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Search Routes</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by path or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All ({allRoutes.length})</TabsTrigger>
          <TabsTrigger value="pages">Pages ({PAGE_ROUTES.length})</TabsTrigger>
          <TabsTrigger value="api">API ({API_ROUTES.length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6 mt-6">
          <div className="grid gap-4">
            {groupedRoutes.map(([category, routes]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="text-lg">{category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {routes.map((route, idx) => (
                      <div
                        key={`${route.path}-${idx}`}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {route.type === "page" && !route.isDynamic ? (
                            <Link
                              href={route.path}
                              className="font-mono text-sm flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400"
                            >
                              {route.path}
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          ) : (
                            <span className="font-mono text-sm">
                              {route.path}
                            </span>
                          )}
                          {route.isDynamic && (
                            <Badge variant="outline" className="text-xs">
                              Dynamic
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {route.method && (
                            <Badge variant="secondary" className="text-xs">
                              {route.method}
                            </Badge>
                          )}
                          <Badge
                            variant={route.type === "page" ? "default" : "outline"}
                            className="text-xs"
                          >
                            {route.type.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredRoutes.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center text-gray-500">
                No routes found matching your search.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Total Routes:</strong> {allRoutes.length} ({PAGE_ROUTES.length} pages, {API_ROUTES.length} API endpoints)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
