import { UserMenu } from "./user-menu";
import { MobileLinks } from "./mobile-links";
import { getUser } from "@/lib/actions/auth";
import { DesktopLinks } from "./desktop-links";
// import ThemeSwitcher from "./theme-switcher";
import Link from "next/link";
import Image from "next/image";

export default async function Navbar() {
  const user = await getUser();

  return (
    <nav className="bg-blue-50 dark:bg-gray-900 shadow-md sticky top-0 z-50">
      <div className="flex justify-between items-center max-w-screen py-2 px-4">
        <div className="flex items-center space-x-2">
          <Link
            href="/dashboard"
            className="flex gap-2 items-center text-black dark:text-white text-xl"
          >
            <Image src="/logo.png" alt="peerBench" width={50} height={50} />
            peerBench
          </Link>
          <DesktopLinks />
        </div>

        <div className="flex items-center space-x-2">
          {/* <ThemeSwitcher /> */}
          {user && <UserMenu user={user} />}
          <MobileLinks />
        </div>
      </div>
    </nav>
  );
}
