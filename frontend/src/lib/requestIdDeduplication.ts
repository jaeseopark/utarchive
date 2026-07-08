/**
 * Manages recent request IDs for WebSocket message deduplication
 * Tracks requests made by the current client to prevent processing
 * the same update twice (once from HTTP response, once from WebSocket)
 */

const recentRequestIds = new Map<string, number>();
const REQUEST_ID_TTL = 5000; // 5 seconds

/**
 * Check if a request ID belongs to the current client
 * Used to deduplicate WebSocket messages for requests initiated by this client
 */
export const isOwnRequest = (requestId: string | undefined): boolean => {
  if (!requestId) return false;

  const timestamp = recentRequestIds.get(requestId);
  if (!timestamp) return false;

  // Clean up old entries
  const age = Date.now() - timestamp;
  if (age > REQUEST_ID_TTL) {
    recentRequestIds.delete(requestId);
    return false;
  }

  return true;
};

/**
 * Register a request ID as originating from this client
 * Called after making an API request to mark it as "ours"
 */
export const registerRequestId = (requestId: string): void => {
  recentRequestIds.set(requestId, Date.now());
};

/**
 * Clean up old request IDs periodically
 * Run this periodically to prevent memory leaks
 */
export const cleanupOldRequestIds = (): void => {
  const now = Date.now();
  const idsToDelete: string[] = [];

  recentRequestIds.forEach((timestamp, requestId) => {
    if (now - timestamp > REQUEST_ID_TTL) {
      idsToDelete.push(requestId);
    }
  });

  idsToDelete.forEach((id) => recentRequestIds.delete(id));
};

/**
 * Clear all request IDs (useful on logout or app reset)
 */
export const clearRequestIds = (): void => {
  recentRequestIds.clear();
};

/**
 * Start cleanup interval to prevent memory leaks
 */
let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

export const startRequestIdCleanup = (): void => {
  if (cleanupIntervalId) return;

  cleanupIntervalId = setInterval(() => {
    cleanupOldRequestIds();
  }, REQUEST_ID_TTL);
};

export const stopRequestIdCleanup = (): void => {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }
};
