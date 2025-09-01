"use client";

import { useEffect } from 'react';
import { usePreloader } from '@/hooks/usePreloader';

export function Preloader() {
  const { isPreloading, isComplete, lastUpdate, startPreloading } = usePreloader();

  // This component doesn't render anything visible
  // It just manages the preloading state in the background
  
  useEffect(() => {
    // Add a small delay to avoid overwhelming the server on initial load
    const timer = setTimeout(() => {
      startPreloading();
    }, 1000); // 1 second delay

    return () => clearTimeout(timer);
  }, [startPreloading]);
  
  useEffect(() => {
    // Log preloading status for debugging
    if (isPreloading) {
      console.log('🔄 Data preloading in progress...');
    }
    
    if (isComplete) {
      console.log('✅ Data preloading completed at:', lastUpdate?.toLocaleTimeString());
    }
  }, [isPreloading, isComplete, lastUpdate]);

  // Return null - this component is invisible
  return null;
}
