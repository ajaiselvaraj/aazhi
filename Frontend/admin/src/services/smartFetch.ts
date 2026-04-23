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
      let latestUpdateResult: any = null;
      
      // STALE-WHILE-REVALIDATE: If we have cache and we aren't forcing reload, return it immediately, THEN fetch background!
      if (!options.force && cacheEntry && cacheEntry.data) {
          // Fire and forget background revalidation
          setTimeout(async () => {
              try {
                  const check = await adminApi.checkUpdates(cacheEntry?.lastFetchedAt);
                  if (check.hasUpdates) {
                      console.log(`[SmartFetch] SWR Update Detected for ${key}. Fetching fresh...`);
                      const freshData = await fetchFn();
                      const nextUpdatedAt = check.latestUpdatedAt || new Date().toISOString();
                      localStorage.setItem(cacheKey, JSON.stringify({ data: freshData, lastFetchedAt: nextUpdatedAt }));
                      // Dispatch event so UI can update seamlessly without full loading screen
                      window.dispatchEvent(new CustomEvent('aazhi_cache_update', { detail: { key, freshData } }));
                  }
              } catch(e) {
                  console.error("SWR update failed", e);
              }
          }, 0);
          console.log(`[SmartFetch] SWR: Returned cache instantly for ${key}`);
          return cacheEntry.data;
      }

      if (options.force) {
        console.log(`📡 [SmartFetch] FORCE RELOAD triggered for ${key}.`);
      } else {
        // 2. Check for updates on server if no cache
        latestUpdateResult = await adminApi.checkUpdates(cacheEntry?.lastFetchedAt);
        const { hasUpdates } = latestUpdateResult;

        if (!hasUpdates && cacheEntry) {
          console.log(`🚀 [SmartFetch] NO UPDATES for ${key}. Using cached data.`);
          return cacheEntry.data;
        }
        console.log(`📡 [SmartFetch] Fetching fresh setup for ${key}...`);
      }

      // 3. Fetch fresh data
      const freshData = await fetchFn();
      
      // Use the timestamp from the update check
      let nextUpdatedAt = new Date().toISOString();
      if (!options.force && latestUpdateResult?.latestUpdatedAt) {
          nextUpdatedAt = latestUpdateResult.latestUpdatedAt;
      }

      // 4. Update cache
      const newEntry: CacheEntry = {
        data: freshData,
        lastFetchedAt: nextUpdatedAt
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
