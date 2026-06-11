// Simple in-memory rate limiter for API routes
// For production, consider using Redis or a service like Upstash

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Check if an identifier has exceeded the rate limit
export function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || now > entry.resetAt) {
    // New window
    store.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return true;
  }

  if (entry.count >= limit) {
    // Rate limited
    return false;
  }

  entry.count++;
  return true;
}

// Get remaining requests for an identifier
export function getRemainingRequests(
  identifier: string,
  limit: number
): number {
  const entry = store.get(identifier);
  if (!entry || Date.now() > entry.resetAt) {
    return limit;
  }
  return Math.max(0, limit - entry.count);
}

// Clean up expired entries
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

// Cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}
