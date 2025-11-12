import { getUser } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import { SimulationControlPanel } from "./components/simulation-control-panel";

export default async function AdminSimulatePage() {
  const user = await getUser();

  // TODO: Add proper admin check
  if (!user) {
    redirect("/");
  }

  return (
    <main className="flex flex-col items-center justify-center mx-auto px-4 py-8 max-w-7xl">
      <div className="w-full mb-8">
        <h1 className="text-3xl font-bold text-black dark:text-white mb-2">
          Admin Simulation Panel
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Generate simulated users, prompts, and feedback for development and testing
        </p>
      </div>

      <SimulationControlPanel />
    </main>
  );
}
