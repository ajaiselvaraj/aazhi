import { adminApi } from './adminApi';

/**
 * PRODUCTION SMART FETCH COMPONENT
 * Implements Low-Internet Dependency logic for the Admin Dashboard.
 */

interface CacheEntry {
  data: any;
  lastFetchedAt: string;
}

export const smartFetch = {
  /**
   * Fetches data only if backend reports newer updates.
   * Otherwise returns cached local storage data.
   */
  get: async (key: string, fetchFn: () => Promise<any>, options: { force?: boolean } = {}) => {
    const cacheKey = `aazhi_cache_${key}`;
    const cached = localStorage.getItem(cacheKey);
    let cacheEntry: CacheEntry | null = null;

    if (cached) {
      try {
        cacheEntry = JSON.parse(cached);
      } catch (e) {
        console.warn(`[SmartFetch] Cache for ${key} is corrupted.`);
      }
    }

    try {
      // 1. Skip update check if we are forcing a reload
      if (options.force) {
        console.log(`📡 [SmartFetch] FORCE RELOAD triggered for ${key}.`);
      } else {
        // 2. Check for updates on server
        const { hasUpdates, latestUpdatedAt } = await adminApi.checkUpdates(cacheEntry?.lastFetchedAt);

        if (!hasUpdates && cacheEntry) {
          console.log(`🚀 [SmartFetch] NO UPDATES for ${key}. Using cached data.`);
          return cacheEntry.data;
        }
        console.log(`📡 [SmartFetch] UPDATES DETECTED for ${key}. Fetching fresh...`);
      }

      // 3. Fetch fresh data
      const freshData = await fetchFn();
      
      // We get latest update time from server to be precise for next time
      const { latestUpdatedAt } = await adminApi.checkUpdates();

      // 4. Update cache
      const newEntry: CacheEntry = {
        data: freshData,
        lastFetchedAt: latestUpdatedAt || new Date().toISOString()
      };
      localStorage.setItem(cacheKey, JSON.stringify(newEntry));

      return freshData;

    } catch (error) {
      console.error(`❌ [SmartFetch] Error during fetch for ${key}:`, error);
      
      // Fallback to cache if internet fails
      if (cacheEntry) {
        console.warn(`⚠️ [SmartFetch] Falling back to CACHE for ${key} due to network error.`);
        return cacheEntry.data;
      }
      throw error;
    }
  },

  /**
   * Force clear cache for a key
   */
  clear: (key: string) => {
    localStorage.removeItem(`aazhi_cache_${key}`);
  }
};
