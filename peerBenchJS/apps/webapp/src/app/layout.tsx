import Navbar from "@/components/navbar";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ToastContainer } from "react-toastify";
import { twMerge } from "tailwind-merge";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";
import { ReduxProvider } from "@/components/ReduxProvider";
import { ReactQueryClientProvider } from "@/components/providers/react-query-client";
import { PreloaderContextProvider } from "@/components/providers/preloader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "peerBench",
  description: "Decentralized AI benchmarking platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ReduxProvider>
          <ReactQueryClientProvider>
            <PreloaderContextProvider>
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
            </PreloaderContextProvider>
          </ReactQueryClientProvider>
          <ToastContainer position="bottom-right" />
        </ReduxProvider>
      </body>
    </html>
  );
}
