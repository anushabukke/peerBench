import { getUser } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import { RoutesDirectory } from "./components/routes-directory";

export default async function AdminRoutesPage() {
  const user = await getUser();

  // TODO: Add proper admin check
  if (!user) {
    redirect("/");
  }

  return (
    <main className="flex flex-col items-center justify-center mx-auto px-4 py-8 max-w-7xl">
      <div className="w-full mb-8">
        <h1 className="text-3xl font-bold text-black dark:text-white mb-2">
          Route Directory
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Complete list of all routes in the application
        </p>
      </div>

      <RoutesDirectory />
    </main>
  );
}
