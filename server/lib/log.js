// Structured JSON logs (one line per event). Never pass raw PII or secrets here —
// use maskEmail()/leadRef() so logs stay useful without exposing visitors.
export function log(level, event, data = {}) {
  if (process.env.NODE_ENV === 'test' && !process.env.LOG_IN_TESTS) return;
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...data });
  (level === 'error' || level === 'warn' ? process.stderr : process.stdout).write(line + '\n');
}
export const maskEmail = (e = '') => {
  const [u, d] = String(e).split('@');
  return d ? `${u.slice(0, 2)}***@${d}` : '***';
};
