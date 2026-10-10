import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addBusinessDays } from '../../server/lib/businessDays.js';

const opts = { timeZone: 'America/New_York', hour: 10 };
test('Friday evening lead is due Monday 10:00 New York', () => {
  const d = addBusinessDays(new Date('2026-10-09T22:00:00Z'), 1, opts); // Fri 18:00 EDT
  assert.equal(d.toISOString(), '2026-10-12T14:00:00.000Z');
});
test('Tuesday lead due Wednesday; 5 business days skips weekend', () => {
  assert.equal(addBusinessDays(new Date('2026-10-13T15:00:00Z'), 1, opts).toISOString(), '2026-10-14T14:00:00.000Z');
  assert.equal(addBusinessDays(new Date('2026-10-13T15:00:00Z'), 5, opts).toISOString(), '2026-10-20T14:00:00.000Z');
});
test('holidays are skipped and DST is respected', () => {
  const d = addBusinessDays(new Date('2026-12-24T15:00:00Z'), 1, { ...opts, holidays: ['2026-12-25'] });
  assert.equal(d.toISOString(), '2026-12-28T15:00:00.000Z'); // EST = UTC-5
});
