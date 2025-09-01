import { Search } from "./components/search";
import { Results } from "./components/results";

export default async function PromptsPage() {
  return (
    <main className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-black dark:text-white mb-2">
            Explore Prompts
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Search through our collection of prompts
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <Search />
        </div>

        <Results />
      </div>
    </main>
  );
}
