import React from 'react';

/**
 * Enhanced lazy loader with automatic reload recovery for SPA chunk version mismatches.
 *
 * When a web app is updated and redeployed (e.g. on Vercel), old chunk files with old hashes
 * are no longer served. If a user already had the app open or cached, navigating to a new tab/route
 * causes dynamic import() to fail with:
 *   - "'text/html' is not a valid JavaScript MIME type for module script" (when server rewrites missing asset to index.html)
 *   - "Failed to fetch dynamically imported module"
 *   - "ChunkLoadError"
 *
 * This wrapper intercepts such errors and immediately triggers a refresh so the browser fetches
 * the latest HTML and bundle without forcing the user to see a broken error screen.
 */
export function lazyWithRetry(componentImport, componentName = 'component') {
  return React.lazy(async () => {
    const sessionKey = `retry_lazy_${componentName}`;
    const hasAlreadyRetried = sessionStorage.getItem(sessionKey);

    try {
      const module = await componentImport();
      // On successful load, clear retry flag
      sessionStorage.removeItem(sessionKey);
      return module;
    } catch (error) {
      console.error(`[lazyWithRetry] Error loading chunk for ${componentName}:`, error);

      const errorMessage = error?.message || String(error);
      const isChunkError =
        errorMessage.includes('MIME type') ||
        errorMessage.includes('dynamically imported module') ||
        errorMessage.includes('Loading chunk') ||
        errorMessage.includes('Failed to fetch') ||
        error?.name === 'ChunkLoadError';

      if (isChunkError && !hasAlreadyRetried) {
        sessionStorage.setItem(sessionKey, 'true');
        console.warn(`[lazyWithRetry] Stale chunk detected for ${componentName}. Auto-refreshing page...`);

        // If Cache Storage API exists, clear old caches to avoid serving stale assets
        if ('caches' in window) {
          try {
            const cacheKeys = await caches.keys();
            await Promise.all(cacheKeys.map((k) => caches.delete(k)));
          } catch (e) {
            console.warn('[lazyWithRetry] Failed to clear caches:', e);
          }
        }

        // Force reload to get the latest deployment
        window.location.reload();

        // Return a component that renders null while page reloads
        return { default: () => null };
      }

      // If already retried or not a chunk mismatch, clear flag and rethrow to ErrorBoundary
      sessionStorage.removeItem(sessionKey);
      throw error;
    }
  });
}
