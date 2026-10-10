// Optional Cloudflare Turnstile verification (server-side).
export async function verifyTurnstile(secret, token, ip, fetchImpl = globalThis.fetch) {
  if (!secret) return { ok: true, skipped: true };
  if (!token) return { ok: false };
  try {
    const res = await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, remoteip: ip || '' }),
    });
    const j = await res.json();
    return { ok: !!j.success };
  } catch {
    // Fail open on Turnstile outage: honeypot, timing and rate limit still apply.
    return { ok: true, degraded: true };
  }
}
