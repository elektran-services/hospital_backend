type Counter = {
  count: number;
  reset: number;
};

type RateLimitResult = {
  ok: boolean;
  remaining: number;
  reset: number;
};

const globalStore = globalThis as typeof globalThis & { __rateLimitStore?: Map<string, Counter> };
const store: Map<string, Counter> = globalStore.__rateLimitStore ?? new Map();
if (!globalStore.__rateLimitStore) {
  globalStore.__rateLimitStore = store;
}

function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  return headers.get("x-real-ip") ?? headers.get("cf-connecting-ip") ?? "unknown";
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.reset <= now) {
    const reset = now + windowMs;
    store.set(key, { count: 1, reset });
    return { ok: true, remaining: limit - 1, reset };
  }

  if (entry.count >= limit) {
    return { ok: false, remaining: 0, reset: entry.reset };
  }

  entry.count += 1;
  return { ok: true, remaining: limit - entry.count, reset: entry.reset };
}

export function rateLimitAuth(req: Request, action: string, limit: number, windowMs: number) {
  const ip = getClientIp(req.headers);
  const key = `auth:${action}:${ip}`;
  return rateLimit(key, limit, windowMs);
}
