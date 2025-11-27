import { getAdminUser } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SystemPromptService } from "@/services/system-prompt.service";
import { PromptDetailView } from "./components/prompt-detail-view";

interface PageProps {
  params: Promise<{ name: string }>;
}

export default async function SystemPromptDetailPage({ params }: PageProps) {
  const user = await getAdminUser();

  if (!user) {
    redirect("/");
  }

  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  const versions = await SystemPromptService.listVersions(decodedName);

  if (versions.length === 0) {
    return (
      <main className="flex flex-col mx-auto px-4 py-8 max-w-7xl">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-black dark:text-white mb-4">
            Prompt Not Found
          </h1>
          <Link
            href="/admin_routes/system-prompts"
            className="text-blue-600 hover:underline"
          >
            ← Back to System Prompts
          </Link>
        </div>
      </main>
    );
  }

  const prompt = versions[0]; // All versions share same base prompt info

  return (
    <main className="mx-auto px-4 py-8 max-w-[1800px] h-screen">
      <PromptDetailView
        promptName={decodedName}
        versions={versions}
        tags={prompt?.tags || []}
        createdAt={prompt?.createdAt ?? new Date()}
      />
    </main>
  );
}
