import PromptsInfiniteList from "@/components/prompts-infinite-list";

export default async function PromptsPage() {
  return (
    <main className="flex flex-col items-center justify-center mx-auto px-4 py-8 max-w-7xl">
      <div className="w-full mb-8">
        <h1 className="text-3xl font-bold text-black dark:text-white mb-2">
          Prompts
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Search through Prompts
        </p>
      </div>

      <PromptsInfiniteList />
    </main>
  );
}
