/**
 * Rate limiter using Upstash Redis.
 * Falls back gracefully (allows request) if env vars not configured.
 */

let ratelimit: any = null;

async function getRatelimiter() {
  if (ratelimit) return ratelimit;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token || url.startsWith("your-")) {
    return null; // dev fallback — no rate limiting
  }

  const { Ratelimit } = await import("@upstash/ratelimit");
  const { Redis } = await import("@upstash/redis");

  const redis = new Redis({ url, token });

  ratelimit = {
    login: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "15 m"),
      prefix: "rl:login",
    }),
    register: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, "1 h"),
      prefix: "rl:register",
    }),
    post: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "1 m"),
      prefix: "rl:post",
    }),
  };

  return ratelimit;
}

export async function checkRateLimit(
  type: "login" | "register" | "post",
  identifier: string
): Promise<{ success: boolean; remaining?: number }> {
  try {
    const rl = await getRatelimiter();
    if (!rl) return { success: true }; // dev fallback

    const result = await rl[type].limit(identifier);
    return { success: result.success, remaining: result.remaining };
  } catch {
    return { success: true }; // fail open — don't break app if Redis down
  }
}
