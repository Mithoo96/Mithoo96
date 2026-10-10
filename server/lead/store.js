import { mkdirSync, writeFileSync, readFileSync, renameSync, readdirSync, existsSync, unlinkSync, chmodSync } from 'node:fs';
import { join } from 'node:path';

// Durable write-ahead store: every valid lead is written to disk BEFORE any
// external call, so a CRM or email outage can never lose a submission.
// One JSON file per lead, named by its idempotency key (a validated UUID),
// which also gives us duplicate-submission detection for free.
export function createLeadStore(dataDir) {
  const dir = join(dataDir, 'leads');
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  try { chmodSync(dir, 0o700); } catch { /* best effort on non-POSIX */ }
  const file = id => join(dir, `${id}.json`);

  const write = (record) => {
    const tmp = file(record.id) + '.tmp';
    writeFileSync(tmp, JSON.stringify(record, null, 2), { mode: 0o600 });
    renameSync(tmp, file(record.id));
    return record;
  };

  return {
    exists: id => existsSync(file(id)),
    get: id => existsSync(file(id)) ? JSON.parse(readFileSync(file(id), 'utf8')) : null,
    create(record) {
      if (existsSync(file(record.id))) return null;
      return write(record);
    },
    update(id, patch) {
      const cur = this.get(id);
      if (!cur) return null;
      return write({ ...cur, ...patch, updatedAt: new Date().toISOString() });
    },
    list() {
      return readdirSync(dir).filter(f => f.endsWith('.json')).map(f => JSON.parse(readFileSync(join(dir, f), 'utf8')));
    },
    // Not yet safely in front of a human: CRM not (fully) synced, or CRM disabled and no email went out.
    pending() {
      return this.list().filter(r => ['pending', 'failed', 'partial'].includes(r.crm?.status)
        || r.notify?.status === 'failed'
        || (r.crm?.status === 'disabled' && r.notify?.status !== 'sent'));
    },
    purgeSynced(retentionDays, now = Date.now()) {
      let n = 0;
      for (const r of this.list()) {
        const synced = r.crm?.status === 'synced' && r.notify?.status !== 'failed';
        if (synced && now - Date.parse(r.createdAt) > retentionDays * 86400_000) { unlinkSync(file(r.id)); n++; }
      }
      return n;
    },
  };
}
