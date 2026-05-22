import IORedis from 'ioredis';

let _redis: IORedis | null = null;

function getRedis(): IORedis {
  if (!_redis) {
    _redis = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      connectTimeout: 2_000,
    });
  }
  return _redis;
}

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  retryAfter: number; // seconds
}

/**
 * Fixed-window rate limiter backed by Redis.
 * Fails open — if Redis is unavailable the request is allowed through.
 */
export async function checkRateLimit(
  key: string,
  limit = 20,
  windowSecs = 60,
): Promise<RateLimitResult> {
  try {
    const redis = getRedis();
    const k = `rl:${key}`;
    const count = await redis.incr(k);
    if (count === 1) await redis.expire(k, windowSecs);
    const remaining = Math.max(0, limit - count);
    return { ok: count <= limit, limit, remaining, retryAfter: windowSecs };
  } catch {
    // Redis unavailable — fail open so the app keeps working
    return { ok: true, limit, remaining: limit, retryAfter: 0 };
  }
}
