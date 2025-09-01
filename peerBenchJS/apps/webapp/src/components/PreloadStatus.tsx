"use client";

import { usePreloader } from '@/hooks/usePreloader';
import { RefreshCw, CheckCircle, Clock, Info } from 'lucide-react';
import { useState } from 'react';

export function PreloadStatus() {
  const { isPreloading, isComplete, lastUpdate } = usePreloader();
  const [showDetails, setShowDetails] = useState(false);

  // Only show when preloading or just completed
  if (!isPreloading && !isComplete) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 min-w-[300px]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            {isPreloading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                <span className="text-gray-700 dark:text-gray-300">
                  Preloading Data
                </span>
              </>
            ) : isComplete ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-gray-700 dark:text-gray-300">
                  Data Ready
                </span>
              </>
            ) : null}
          </div>
          
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title="Toggle details"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>

        {lastUpdate && (
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <Clock className="h-3 w-3" />
            <span>Updated: {lastUpdate.toLocaleTimeString()}</span>
          </div>
        )}

        {showDetails && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
            <div className="text-xs text-gray-600 dark:text-gray-400">
              <div className="mb-2">
                <span className="font-medium">Status:</span> {isPreloading ? 'Preloading...' : 'Complete'}
              </div>
              
              {window.extra_logging && (
                <div className="text-xs text-blue-600 dark:text-blue-400">
                  💡 Extra logging enabled - check console for details
                </div>
              )}
              
              <div className="mt-2 text-xs text-gray-500">
                💡 Click the info button to see detailed cache status
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
