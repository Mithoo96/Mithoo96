// Business-day helpers used to schedule follow-up tasks.
// Weekends are skipped; optional holiday list (YYYY-MM-DD in the business time zone).
const fmt = (d, timeZone) => new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })
  .formatToParts(d).reduce((a, p) => (a[p.type] = p.value, a), {});

function isBusinessDay(date, timeZone, holidays) {
  const p = fmt(date, timeZone);
  if (p.weekday === 'Sat' || p.weekday === 'Sun') return false;
  return !holidays.includes(`${p.year}-${p.month}-${p.day}`);
}

/**
 * Returns a Date `n` business days after `from`, at `hour`:00 local time in `timeZone`.
 * n = 1 → next business day (a lead arriving Friday evening is due Monday).
 */
export function addBusinessDays(from, n, { timeZone = 'America/New_York', hour = 10, holidays = [] } = {}) {
  let d = new Date(from.getTime());
  let added = 0;
  while (added < n) {
    d = new Date(d.getTime() + 86400_000);
    if (isBusinessDay(d, timeZone, holidays)) added++;
  }
  // Set local wall-clock hour in the target time zone.
  const p = fmt(d, timeZone);
  const guess = new Date(Date.UTC(+p.year, +p.month - 1, +p.day, hour, 0, 0));
  const offsetMin = tzOffsetMinutes(guess, timeZone);
  return new Date(guess.getTime() - offsetMin * 60_000);
}

function tzOffsetMinutes(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .formatToParts(date).reduce((a, p) => (a[p.type] = p.value, a), {});
  const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return Math.round((asUTC - date.getTime()) / 60_000);
}
