import { getAdminUser } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SystemPromptService } from "@/services/system-prompt.service";

export default async function SystemPromptsPage() {
  const user = await getAdminUser();

  if (!user) {
    redirect("/");
  }

  const prompts = await SystemPromptService.listPrompts();

  return (
    <main className="flex flex-col mx-auto px-4 py-8 max-w-7xl">
      <div className="w-full mb-8">
        <h1 className="text-3xl font-bold text-black dark:text-white mb-2">
          System Prompts Registry
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage system prompts with version control and labels
        </p>
      </div>

      <div className="w-full">
        {prompts.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No system prompts found. Create one using the API.
          </div>
        ) : (
          <div className="grid gap-4">
            {prompts.map((prompt) => (
              <Link
                key={prompt.id}
                href={`/admin_routes/system-prompts/${encodeURIComponent(prompt.name)}`}
                className="block p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-black dark:text-white mb-2">
                      {prompt.name}
                    </h3>

                    {prompt.tags && prompt.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {prompt.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Created: {new Date(prompt.createdAt).toLocaleDateString()}
                      {" • "}
                      Updated: {new Date(prompt.updatedAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h3 className="font-semibold text-black dark:text-white mb-2">
          API Endpoints
        </h3>
        <div className="space-y-1 text-sm font-mono text-gray-600 dark:text-gray-300">
          <div>GET /api/v2/system-prompts?name=&lt;name&gt;&label=&lt;label&gt;</div>
          <div>GET /api/v2/system-prompts?sha256=&lt;hash&gt;</div>
          <div>POST /api/v2/system-prompts (requires auth)</div>
          <div>GET /api/v2/system-prompts/list</div>
        </div>
      </div>
    </main>
  );
}
