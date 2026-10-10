// Fixed-window-per-key limiter kept in memory. Good for a single instance;
// for multiple instances put the same rule at the proxy/CDN (documented in DEPLOYMENT.md).
export function createRateLimiter({ limit, windowMs = 60 * 60 * 1000, now = () => Date.now() }) {
  const hits = new Map();
  function sweep(t) {
    for (const [k, v] of hits) if (t - v.start >= windowMs) hits.delete(k);
  }
  return {
    check(key) {
      const t = now();
      if (hits.size > 10_000) sweep(t);
      let entry = hits.get(key);
      if (!entry || t - entry.start >= windowMs) { entry = { start: t, count: 0 }; hits.set(key, entry); }
      entry.count += 1;
      const allowed = entry.count <= limit;
      return { allowed, remaining: Math.max(0, limit - entry.count), retryAfterSec: allowed ? 0 : Math.ceil((entry.start + windowMs - t) / 1000) };
    },
  };
}
