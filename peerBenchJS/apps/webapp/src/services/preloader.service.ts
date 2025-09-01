// Browser-safe preloader service that doesn't import server-side code
// This service will coordinate with API endpoints instead of direct database access

// Global flag to control extra logging (can be set in browser console)
declare global {
  interface Window {
    extra_logging?: boolean;
  }
}

interface PreloadedData {
  peers: {
    leaderboard: any;
    validatorStats: any;
    organizationStats: any;
  } | null;
  leaderboard: any[] | null;
  inspect: {
    files: any[];
    total: number;
  } | null;
  explore: {
    recentPrompts: any[] | null;
  } | null;
  upload: {
    availableSchemas: any[] | null;
  } | null;
  promptSets: any[] | null;
  timestamp: number;
  isComplete: boolean;
}

class PreloaderService {
  private static instance: PreloaderService;
  private cache: PreloadedData = {
    peers: null,
    leaderboard: null,
    inspect: null,
    explore: null,
    upload: null,
    promptSets: null,
    timestamp: 0,
    isComplete: false,
  };

  private isLoading = false;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private startTime: number = 0;

  private constructor() {}

  static getInstance(): PreloaderService {
    if (!PreloaderService.instance) {
      PreloaderService.instance = new PreloaderService();
    }
    return PreloaderService.instance;
  }

  // Check if cache is still valid
  private isCacheValid(): boolean {
    return (
      this.cache.timestamp > 0 &&
      Date.now() - this.cache.timestamp < this.CACHE_DURATION &&
      this.cache.isComplete
    );
  }

  // Get cached data if available
  getCachedData(key: keyof Omit<PreloadedData, 'timestamp' | 'isComplete'>): any {
    if (this.isCacheValid()) {
      if (window.extra_logging) {
        console.log(`🎯 [PRELOADER] Cache HIT for ${key}:`, this.cache[key]);
      }
      return this.cache[key];
    }
    
    if (window.extra_logging) {
      console.log(`❌ [PRELOADER] Cache MISS for ${key} - expired or not loaded`);
    }
    return null;
  }

  // Start preloading all data in the background using API endpoints
  async startPreloading(): Promise<void> {
    if (this.isLoading || this.isCacheValid()) {
      if (window.extra_logging) {
        console.log(`🚫 [PRELOADER] Skipping preload - already loading: ${this.isLoading}, cache valid: ${this.isCacheValid()}`);
      }
      return;
    }

    this.isLoading = true;
    this.startTime = performance.now();
    
    if (window.extra_logging) {
      console.log('🚀 [PRELOADER] Starting data preloading...');
      console.log('⏱️ [PRELOADER] Start time:', new Date().toISOString());
    }

    try {
      // Preload in priority order with parallel execution where possible
      const preloadPromises = [
        this.preloadPeersData(),
        this.preloadLeaderboardData(),
        this.preloadInspectData(),
        this.preloadExploreData(),
        this.preloadUploadData(),
        this.preloadPromptSetsData(),
      ];

      // Execute all preloads in parallel
      await Promise.allSettled(preloadPromises);

      const endTime = performance.now();
      const totalTime = endTime - this.startTime;
      
      this.cache.timestamp = Date.now();
      this.cache.isComplete = true;
      
      if (window.extra_logging) {
        console.log('✅ [PRELOADER] Data preloading completed');
        console.log('⏱️ [PRELOADER] Total preload time:', totalTime.toFixed(2), 'ms');
        console.log('📊 [PRELOADER] Cache status:', this.getCacheStatus());
        console.log('💾 [PRELOADER] Cached data sizes:', {
          peers: this.cache.peers ? 'loaded' : 'null',
          leaderboard: this.cache.leaderboard ? `${this.cache.leaderboard.length} items` : 'null',
          inspect: this.cache.inspect ? `${this.cache.inspect.files.length} files` : 'null',
          explore: this.cache.explore ? 'loaded' : 'null',
          upload: this.cache.upload ? 'loaded' : 'null',
          promptSets: this.cache.promptSets ? 'loaded' : 'null',
        });
      }
    } catch (error) {
      if (window.extra_logging) {
        console.error('💥 [PRELOADER] Error during preloading:', error);
      }
    } finally {
      this.isLoading = false;
    }
  }

  // Preload peers data using API endpoint
  private async preloadPeersData(): Promise<void> {
    const startTime = performance.now();
    
    try {
      if (window.extra_logging) {
        console.log('📊 [PRELOADER] Starting peers data preload...');
      }
      
      const [leaderboardRes, validatorStatsRes, organizationStatsRes] = await Promise.all([
        fetch('/api/v1/stats/peer-leaderboard'),
        fetch('/api/v1/stats/validator-leaderboard'),
        fetch('/api/v1/stats/organization-stats'),
      ]);

      if (leaderboardRes.ok && validatorStatsRes.ok && organizationStatsRes.ok) {
        const [leaderboard, validatorStats, organizationStats] = await Promise.all([
          leaderboardRes.json(),
          validatorStatsRes.json(),
          organizationStatsRes.json(),
        ]);

        this.cache.peers = { leaderboard, validatorStats, organizationStats };
        
        const endTime = performance.now();
        if (window.extra_logging) {
          console.log('✅ [PRELOADER] Peers data preloaded in', (endTime - startTime).toFixed(2), 'ms');
          console.log('📊 [PRELOADER] Peers data size:', {
            leaderboard: leaderboard ? 'loaded' : 'null',
            validatorStats: validatorStats ? 'loaded' : 'null',
            organizationStats: organizationStats ? 'loaded' : 'null'
          });
        }
      } else {
        if (window.extra_logging) {
          console.error('❌ [PRELOADER] Failed to fetch peers data:', {
            leaderboard: leaderboardRes.status,
            validatorStats: validatorStatsRes.status,
            organizationStats: organizationStatsRes.status
          });
        }
      }
    } catch (error) {
      if (window.extra_logging) {
        console.error('❌ [PRELOADER] Failed to preload peers data:', error);
      }
    }
  }

  // Preload leaderboard data using API endpoint
  private async preloadLeaderboardData(): Promise<void> {
    const startTime = performance.now();
    
    try {
      if (window.extra_logging) {
        console.log('🏆 [PRELOADER] Starting leaderboard data preload...');
      }
      
      const response = await fetch('/api/v1/leaderboard');
      
      if (response.ok) {
        const leaderboards = await response.json();
        this.cache.leaderboard = leaderboards;
        
        const endTime = performance.now();
        if (window.extra_logging) {
          console.log('✅ [PRELOADER] Leaderboard data preloaded in', (endTime - startTime).toFixed(2), 'ms');
          console.log('🏆 [PRELOADER] Leaderboard count:', leaderboards.length);
        }
      } else {
        if (window.extra_logging) {
          console.error('❌ [PRELOADER] Failed to fetch leaderboard data:', response.status);
        }
      }
    } catch (error) {
      if (window.extra_logging) {
        console.error('❌ [PRELOADER] Failed to preload leaderboard data:', error);
      }
    }
  }

  // Preload inspect data using API endpoint
  private async preloadInspectData(): Promise<void> {
    const startTime = performance.now();
    
    try {
      if (window.extra_logging) {
        console.log('🔍 [PRELOADER] Starting inspect data preload...');
      }
      
      const response = await fetch('/api/v1/inspect/files?page=1&pageSize=10');
      
      if (response.ok) {
        const data = await response.json();
        this.cache.inspect = {
          files: data.results,
          total: data.total,
        };
        
        const endTime = performance.now();
        if (window.extra_logging) {
          console.log('✅ [PRELOADER] Inspect data preloaded in', (endTime - startTime).toFixed(2), 'ms');
          console.log('🔍 [PRELOADER] Inspect data size:', `${data.results.length} files, total: ${data.total}`);
        }
      } else {
        if (window.extra_logging) {
          console.error('❌ [PRELOADER] Failed to fetch inspect data:', response.status);
        }
      }
    } catch (error) {
      if (window.extra_logging) {
        console.error('❌ [PRELOADER] Failed to preload inspect data:', error);
      }
    }
  }

  // Preload explore data (basic search data)
  private async preloadExploreData(): Promise<void> {
    const startTime = performance.now();
    
    try {
      if (window.extra_logging) {
        console.log('🔎 [PRELOADER] Starting explore data preload...');
      }
      
      // For now, we'll just mark this as ready since explore is mostly client-side
      // In the future, we could preload recent prompts or popular searches
      this.cache.explore = {
        recentPrompts: null, // Could be populated with recent prompts
      };
      
      const endTime = performance.now();
      if (window.extra_logging) {
        console.log('✅ [PRELOADER] Explore data preloaded in', (endTime - startTime).toFixed(2), 'ms');
      }
    } catch (error) {
      if (window.extra_logging) {
        console.error('❌ [PRELOADER] Failed to preload explore data:', error);
      }
    }
  }

  // Preload upload data (schemas, templates)
  private async preloadUploadData(): Promise<void> {
    const startTime = performance.now();
    
    try {
      if (window.extra_logging) {
        console.log('📤 [PRELOADER] Starting upload data preload...');
      }
      
      // For now, we'll just mark this as ready
      // In the future, we could preload available schemas or templates
      this.cache.upload = {
        availableSchemas: null, // Could be populated with available schemas
      };
      
      const endTime = performance.now();
      if (window.extra_logging) {
        console.log('✅ [PRELOADER] Upload data preloaded in', (endTime - startTime).toFixed(2), 'ms');
      }
    } catch (error) {
      if (window.extra_logging) {
        console.error('❌ [PRELOADER] Failed to preload upload data:', error);
      }
    }
  }

  // Preload prompt sets data using API endpoint
  private async preloadPromptSetsData(): Promise<void> {
    const startTime = performance.now();
    
    try {
      if (window.extra_logging) {
        console.log('🎨 [PRELOADER] Starting prompt sets data preload...');
      }
      
      const response = await fetch('/api/v1/prompt-sets');
      
      if (response.ok) {
        const promptSets = await response.json();
        this.cache.promptSets = promptSets;
        
        const endTime = performance.now();
        if (window.extra_logging) {
          console.log('✅ [PRELOADER] Prompt sets data preloaded in', (endTime - startTime).toFixed(2), 'ms');
          console.log('🎨 [PRELOADER] Prompt sets count:', promptSets.length);
        }
      } else {
        if (window.extra_logging) {
          console.error('❌ [PRELOADER] Failed to fetch prompt sets data:', response.status);
        }
      }
    } catch (error) {
      if (window.extra_logging) {
        console.error('❌ [PRELOADER] Failed to preload prompt sets data:', error);
      }
    }
  }

  // Force refresh all cached data
  async refreshCache(): Promise<void> {
    if (window.extra_logging) {
      console.log('🔄 [PRELOADER] Forcing cache refresh...');
    }
    
    this.cache = {
      peers: null,
      leaderboard: null,
      inspect: null,
      explore: null,
      upload: null,
      promptSets: null,
      timestamp: 0,
      isComplete: false,
    };
    await this.startPreloading();
  }

  // Get loading status
  getLoadingStatus(): boolean {
    return this.isLoading;
  }

  // Get cache status
  getCacheStatus(): { isComplete: boolean; timestamp: number } {
    return {
      isComplete: this.cache.isComplete,
      timestamp: this.cache.timestamp,
    };
  }

  // Debug method to show cache contents
  debugCache(): void {
    if (window.extra_logging) {
      console.log('🔍 [PRELOADER] Cache Debug Info:');
      console.log('📊 Cache status:', this.getCacheStatus());
      console.log('💾 Cached data:', this.cache);
      console.log('⏱️ Cache age:', this.cache.timestamp ? `${((Date.now() - this.cache.timestamp) / 1000).toFixed(1)}s old` : 'never set');
    }
  }
}

export const preloaderService = PreloaderService.getInstance();
