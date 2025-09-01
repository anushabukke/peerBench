import { useEffect, useState, useCallback } from "react";
import { preloaderService } from "@/services/preloader.service";

export function usePreloader() {
  const [isPreloading, setIsPreloading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Start preloading
  const startPreloading = useCallback(async () => {
    if (window.extra_logging) {
      console.log("🚀 [HOOK] Starting preloading from hook...");
    }

    setIsPreloading(true);
    try {
      await preloaderService.startPreloading();
      const status = preloaderService.getCacheStatus();
      setIsComplete(status.isComplete);
      setLastUpdate(new Date(status.timestamp));

      if (window.extra_logging) {
        console.log("✅ [HOOK] Preloading completed in hook");
        console.log("📊 [HOOK] Final status:", status);
      }
    } finally {
      setIsPreloading(false);
    }
  }, []);

  // Refresh cache
  const refreshCache = useCallback(async () => {
    if (window.extra_logging) {
      console.log("🔄 [HOOK] Refreshing cache from hook...");
    }

    setIsPreloading(true);
    try {
      await preloaderService.refreshCache();
      const status = preloaderService.getCacheStatus();
      setIsComplete(status.isComplete);
      setLastUpdate(new Date(status.timestamp));

      if (window.extra_logging) {
        console.log("✅ [HOOK] Cache refresh completed");
      }
    } finally {
      setIsPreloading(false);
    }
  }, []);

  // Get cached data
  const getCachedData = useCallback(
    <T extends keyof ReturnType<typeof preloaderService.getCachedData>>(
      key: T
    ) => {
      if (window.extra_logging) {
        console.log(`🔍 [HOOK] Getting cached data for: ${String(key)}`);
      }

      const data = preloaderService.getCachedData(key as any);

      if (window.extra_logging) {
        if (data) {
          console.log(`🎯 [HOOK] Cache HIT for ${String(key)}:`, data);
        } else {
          console.log(`❌ [HOOK] Cache MISS for ${String(key)}`);
        }
      }

      return data;
    },
    []
  );

  // Check if data is available
  const isDataAvailable = useCallback(
    (key: keyof ReturnType<typeof preloaderService.getCachedData>) => {
      const available = preloaderService.getCachedData(key as any) !== null;

      if (window.extra_logging) {
        console.log(
          `🔍 [HOOK] Data availability check for ${String(key)}:`,
          available ? "✅ AVAILABLE" : "❌ NOT AVAILABLE"
        );
      }

      return available;
    },
    []
  );

  // Auto-start preloading on mount
  useEffect(() => {
    if (window.extra_logging) {
      console.log(
        "🎬 [HOOK] usePreloader hook mounted, starting preloading..."
      );
    }

    startPreloading();
  }, [startPreloading]);

  return {
    isPreloading,
    isComplete,
    lastUpdate,
    startPreloading,
    refreshCache,
    getCachedData,
    isDataAvailable,
  };
}
