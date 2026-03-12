/**
 * In-memory sliding window rate limiter.
 * Replaces express-rate-limit for Next.js Route Handlers.
 *
 * In standalone mode, the process is long-lived so the Map persists.
 * Periodic cleanup prevents memory leaks.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean expired entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let cleanupTimer: NodeJS.Timeout | null = null;

function startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
  // Don't prevent process from exiting
  if (cleanupTimer.unref) cleanupTimer.unref();
}

startCleanup();

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
  message?: string;
}

/**
 * Check rate limit for a given identifier (typically IP address).
 * Returns { success, remaining, resetAt }.
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = `${config.windowMs}:${identifier}`;
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // First request or window expired
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { success: true, remaining: config.max - 1, resetAt: now + config.windowMs };
  }

  entry.count++;

  if (entry.count > config.max) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
      message: config.message,
    };
  }

  return { success: true, remaining: config.max - entry.count, resetAt: entry.resetAt };
}

/**
 * Get the client IP from a NextRequest.
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || '127.0.0.1';
}

// Pre-configured rate limit configs matching Express setup
export const RATE_LIMITS = {
  global: { windowMs: 60 * 1000, max: 100, message: 'יותר מדי בקשות, נסה שוב בעוד דקה' },
  auth: { windowMs: 15 * 60 * 1000, max: 10, message: 'יותר מדי ניסיונות התחברות, נסה שוב בעוד 15 דקות' },
  gemini: { windowMs: 60 * 60 * 1000, max: 30, message: 'מכסת AI הגיעה למקסימום, נסה שוב בעוד שעה' },
  upload: { windowMs: 15 * 60 * 1000, max: 10, message: 'יותר מדי העלאות, נסה שוב בעוד 15 דקות' },
  comments: { windowMs: 5 * 60 * 1000, max: 20, message: 'יותר מדי בקשות, נסה שוב בעוד כמה דקות' },
  gamification: { windowMs: 60 * 1000, max: 10, message: 'יותר מדי בקשות' },
} as const;

/**
 * Helper to apply rate limiting in a route handler.
 * Returns a Response if rate limited, or null if allowed.
 *
 * Usage:
 *   const limited = applyRateLimit(request, RATE_LIMITS.auth);
 *   if (limited) return limited;
 */
export function applyRateLimit(
  request: Request,
  config: RateLimitConfig
): Response | null {
  const ip = getClientIP(request);
  const result = checkRateLimit(ip, config);

  if (!result.success) {
    return new Response(
      JSON.stringify({ error: result.message || 'Rate limit exceeded' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(config.max),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
        },
      }
    );
  }

  return null;
}
