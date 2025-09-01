import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import Navbar from "@/components/navbar";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { twMerge } from "tailwind-merge";
import AutoKeyGenerator from "@/components/auto-key-generator";
import { Preloader } from "@/components/Preloader";
import { PreloadStatus } from "@/components/PreloadStatus";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "peerBench",
  description: "Decentralized AI benchmarking platform",
};

export const fetchCache = "force-no-store";
export const revalidate = 0;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light">
          <Preloader />
          <AutoKeyGenerator />
          <Navbar />
          <div className="min-h-[calc(100vh-64px)] flex overflow-y-auto">
            <main
              className={twMerge(
                "flex-1 bg-gray-50 transition-all duration-300"
              )}
            >
              {children}
            </main>
          </div>
          <ToastContainer position="bottom-right" />
          <PreloadStatus />
        </ThemeProvider>
      </body>
    </html>
  );
}
