import { INDEXES, TABLES } from '../db/schema';
import type { SqlStorageLike } from './context';

const sqlType = (kind: string) => (kind === 'number' ? 'REAL' : kind === 'boolean' ? 'INTEGER' : 'TEXT');

/**
 * Creates missing tables / columns / indexes. Safe to run on every start:
 * additive schema changes in db/schema.ts are applied automatically.
 */
export function migrate(sql: SqlStorageLike): void {
  const run = (q: string) => sql.exec(q).toArray();

  for (const t of TABLES) {
    const dataFields = t.fields.filter((f) => !f.role);
    run(
      `CREATE TABLE IF NOT EXISTS "${t.sdk}" (
        "id" TEXT PRIMARY KEY,
        "autonumber_id" INTEGER,
        "created_at" TEXT NOT NULL,
        "updated_at" TEXT NOT NULL,
        ${dataFields.map((f) => `"${f.name}" ${sqlType(f.kind)}`).join(',\n        ')}
      )`,
    );
    const existing = new Set(sql.exec(`PRAGMA table_info("${t.sdk}")`).toArray().map((r) => String(r.name)));
    for (const f of dataFields) {
      if (!existing.has(f.name)) run(`ALTER TABLE "${t.sdk}" ADD COLUMN "${f.name}" ${sqlType(f.kind)}`);
    }
    run(`CREATE INDEX IF NOT EXISTS "idx_${t.sdk}_created" ON "${t.sdk}" ("created_at")`);
    const names = new Set(dataFields.map((f) => f.name));
    for (const c of INDEXES[t.sdk] ?? []) {
      if (names.has(c)) run(`CREATE INDEX IF NOT EXISTS "idx_${t.sdk}_${c}" ON "${t.sdk}" ("${c}")`);
    }
  }

  run(`CREATE TABLE IF NOT EXISTS "_files" (
    "id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL, "data" BLOB NOT NULL, "created_at" TEXT NOT NULL)`);
  run(`CREATE TABLE IF NOT EXISTS "_rate_limit" ("bucket" TEXT NOT NULL, "at" INTEGER NOT NULL)`);
  run(`CREATE INDEX IF NOT EXISTS "idx__rate_limit_bucket" ON "_rate_limit" ("bucket", "at")`);
}
