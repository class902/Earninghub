import { TABLES, type FieldDef, type TableDef } from '../db/schema';
import { ApiError } from './backend';
import { runtime } from './context';

type Row = Record<string, unknown>;
type Scalar = string | number | boolean | null;
type FilterValue = Scalar | { contains?: string; not?: Scalar; in?: Scalar[]; notIn?: Scalar[]; lt?: Scalar; lte?: Scalar; gt?: Scalar; gte?: Scalar };
export type Filters = Record<string, FilterValue | undefined>;

// ── Record shape: loosely typed, endpoints narrow as needed ─────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = any;

export interface TableClient {
  findAll(params?: { filters?: Filters; offset?: number; limit?: number; fields?: string[]; sort?: unknown }): Promise<{ records: AnyRecord[]; hasMore: boolean }>;
  findOne(params: { id?: string; filters?: Filters; fields?: string[] }): Promise<AnyRecord | undefined>;
  create(params: { record: AnyRecord }): Promise<AnyRecord>;
  update(params: { id: string; record: AnyRecord }): Promise<{ id: string; fields: AnyRecord }>;
  delete(params: { id: string }): Promise<{ success: true; id: string }>;
  bulkCreate(params: { records: AnyRecord[]; matchOn?: string[] }): Promise<{ success: boolean; records: AnyRecord[] }>;
}

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 2000;

const column = (f: FieldDef): string =>
  f.role === 'createdAt' ? 'created_at' : f.role === 'updatedAt' ? 'updated_at' : f.role === 'autonumber' ? 'autonumber_id' : f.name;

function toDb(f: FieldDef, v: unknown): Scalar | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  switch (f.kind) {
    case 'number': {
      if (v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }
    case 'boolean':
      return v === true || v === 1 || v === '1' || v === 'true' ? 1 : 0;
    case 'json':
      return typeof v === 'string' ? v : JSON.stringify(v);
    default:
      return typeof v === 'string' ? v : typeof v === 'object' ? JSON.stringify(v) : String(v);
  }
}

function fromDb(t: TableDef, row: Row): AnyRecord {
  const rec: AnyRecord = { id: row.id };
  for (const f of t.fields) {
    const v = row[column(f)];
    if (v === null || v === undefined) continue;
    if (f.kind === 'boolean') rec[f.name] = v === 1 || v === true;
    else if (f.kind === 'number') rec[f.name] = Number(v);
    else if (f.kind === 'json') {
      try { rec[f.name] = JSON.parse(String(v)); } catch { rec[f.name] = v; }
    } else rec[f.name] = v;
  }
  return rec;
}

function bindValue(f: FieldDef | undefined, v: unknown): Scalar {
  if (v === null || v === undefined) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (f) return (toDb(f, v) ?? null) as Scalar;
  return v as Scalar;
}

function buildWhere(t: TableDef, filters: Filters | undefined): { where: string; params: Scalar[] } {
  const clauses: string[] = [];
  const params: Scalar[] = [];
  for (const [name, raw] of Object.entries(filters ?? {})) {
    if (raw === undefined) continue;
    const isId = name === 'id';
    const f = isId ? undefined : t.fields.find((x) => x.name === name);
    if (!isId && !f) throw new ApiError({ code: 'BAD_REQUEST', message: `Unknown field "${name}" on ${t.sdk}` });
    const col = `"${isId ? 'id' : column(f!)}"`;
    const isOp = raw !== null && typeof raw === 'object' && !Array.isArray(raw);
    if (!isOp) {
      if (raw === null) clauses.push(`${col} IS NULL`);
      else { clauses.push(`${col} = ?`); params.push(bindValue(f, raw)); }
      continue;
    }
    const ops = raw as Exclude<FilterValue, Scalar>;
    if (ops.contains !== undefined) {
      clauses.push(`${col} LIKE ? ESCAPE '\\'`);
      params.push(`%${String(ops.contains).replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    }
    if ('not' in ops) {
      if (ops.not === null) clauses.push(`${col} IS NOT NULL`);
      else { clauses.push(`${col} IS NOT ?`); params.push(bindValue(f, ops.not)); }
    }
    if (ops.in !== undefined) {
      if (ops.in.length === 0) clauses.push('0');
      else { clauses.push(`${col} IN (${ops.in.map(() => '?').join(',')})`); ops.in.forEach((v) => params.push(bindValue(f, v))); }
    }
    if (ops.notIn !== undefined && ops.notIn.length > 0) {
      clauses.push(`(${col} IS NULL OR ${col} NOT IN (${ops.notIn.map(() => '?').join(',')}))`);
      ops.notIn.forEach((v) => params.push(bindValue(f, v)));
    }
    for (const [op, sym] of [['lt', '<'], ['lte', '<='], ['gt', '>'], ['gte', '>=']] as const) {
      if (ops[op] !== undefined) { clauses.push(`${col} ${sym} ?`); params.push(bindValue(f, ops[op])); }
    }
  }
  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

function exec(query: string, params: unknown[] = []): Row[] {
  return runtime().sql.exec(query, ...params).toArray();
}

function createTableClient(t: TableDef): TableClient {
  const writable = t.fields.filter((f) => !f.role);
  const getById = (id: string): AnyRecord | undefined => {
    const rows = exec(`SELECT * FROM "${t.sdk}" WHERE "id" = ? LIMIT 1`, [id]);
    return rows[0] ? fromDb(t, rows[0]) : undefined;
  };

  const insert = (record: AnyRecord): AnyRecord => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const cols: string[] = []; const vals: Scalar[] = [];
    for (const f of writable) {
      const v = toDb(f, record?.[f.name]);
      if (v !== undefined) { cols.push(`"${f.name}"`); vals.push(v); }
    }
    exec(
      `INSERT INTO "${t.sdk}" ("id","autonumber_id","created_at","updated_at"${cols.length ? ',' + cols.join(',') : ''})
       VALUES (?, (SELECT COALESCE(MAX("autonumber_id"),0)+1 FROM "${t.sdk}"), ?, ?${vals.map(() => ',?').join('')})`,
      [id, now, now, ...vals],
    );
    return getById(id)!;
  };

  const patch = (id: string, record: AnyRecord): AnyRecord => {
    if (!getById(id)) throw new ApiError({ code: 'NOT_FOUND', message: `${t.sdk} record not found` });
    const sets: string[] = ['"updated_at" = ?']; const vals: Scalar[] = [new Date().toISOString()];
    for (const f of writable) {
      const v = toDb(f, record?.[f.name]);
      if (v !== undefined) { sets.push(`"${f.name}" = ?`); vals.push(v); }
    }
    exec(`UPDATE "${t.sdk}" SET ${sets.join(', ')} WHERE "id" = ?`, [...vals, id]);
    return getById(id)!;
  };

  return {
    async findAll(params = {}) {
      const limit = Math.min(Math.max(Number(params.limit ?? DEFAULT_LIMIT) || DEFAULT_LIMIT, 1), MAX_LIMIT);
      const offset = Math.max(Number(params.offset ?? 0) || 0, 0);
      const { where, params: bind } = buildWhere(t, params.filters);
      const rows = exec(
        `SELECT * FROM "${t.sdk}" ${where} ORDER BY "created_at" ASC, "autonumber_id" ASC LIMIT ? OFFSET ?`,
        [...bind, limit + 1, offset],
      );
      return { records: rows.slice(0, limit).map((r) => fromDb(t, r)), hasMore: rows.length > limit };
    },
    async findOne({ id, filters }) {
      if (id) return getById(id);
      const { where, params: bind } = buildWhere(t, filters);
      const rows = exec(`SELECT * FROM "${t.sdk}" ${where} ORDER BY "created_at" ASC LIMIT 1`, bind);
      return rows[0] ? fromDb(t, rows[0]) : undefined;
    },
    async create({ record }) {
      return insert(record);
    },
    async update({ id, record }) {
      const updated = patch(id, record);
      return { id, fields: updated };
    },
    async delete({ id }) {
      exec(`DELETE FROM "${t.sdk}" WHERE "id" = ?`, [id]);
      return { success: true, id };
    },
    async bulkCreate({ records, matchOn }) {
      if (records.length > 100) throw new ApiError({ code: 'BAD_REQUEST', message: 'bulkCreate accepts at most 100 records per call' });
      const out: AnyRecord[] = [];
      for (const record of records) {
        if (matchOn?.length) {
          const filters: Filters = {};
          for (const k of matchOn) filters[k] = record?.[k] as Scalar;
          const { where, params: bind } = buildWhere(t, filters);
          const hit = exec(`SELECT "id" FROM "${t.sdk}" ${where} LIMIT 1`, bind)[0];
          if (hit) { out.push(patch(String(hit.id), record)); continue; }
        }
        out.push(insert(record));
      }
      return { success: true, records: out };
    },
  };
}

type Db = { [K in string]: TableClient } & {
  offers: TableClient; leads: TableClient; posters: TableClient; cashbackForms: TableClient;
  cashbackSubmissions: TableClient; referrals: TableClient; appBackups: TableClient;
  referralLinks: TableClient; referralLeads: TableClient; referralAuditLog: TableClient;
  sql(params: { query: string; params?: unknown[] }): Promise<{ rows: Row[]; columns: { name: string; originalName: string }[]; rowCount: number; truncated: boolean }>;
};

const SQL_ROW_CAP = 2000;

const ISO = "'%Y-%m-%dT%H:%M:%fZ'";
const ISO_DAY = "'%Y-%m-%dT00:00:00.000Z'";
const ISO_MONTH = "'%Y-%m-01T00:00:00.000Z'";

/** "7 days" | "24 hours" | "1 month" | "2 weeks" -> SQLite date modifier (e.g. "+7 days"). */
function modifier(sign: '+' | '-', amount: string, unit: string): string {
  const n = Number(amount);
  const u = unit.toLowerCase().replace(/s$/, '');
  return u === 'week' ? `${sign}${n * 7} days` : `${sign}${n} ${u}s`;
}

/** Adapts the Postgres-flavoured read-only queries used by the reporting endpoints to SQLite. */
export function translateSql(query: string, params: unknown[] = []): { query: string; params: unknown[] } {
  const ordered: unknown[] = [];
  const INTERVAL = /\s*([+-])\s*INTERVAL\s*'(\d+)\s*(second|minute|hour|day|week|month|year)s?'/i;
  let q = query
    .replace(/\$(\d+)/g, (_m, n) => { ordered.push(params[Number(n) - 1]); return '?'; })
    // date_trunc('month', NOW() [- INTERVAL 'n unit'])
    .replace(new RegExp(`date_trunc\\(\\s*'month'\\s*,\\s*NOW\\(\\)(${INTERVAL.source})?\\s*\\)`, 'gi'), (_m, _g, sign, n, unit) =>
      sign ? `strftime(${ISO_MONTH},'now','start of month','${modifier(sign, n, unit)}')` : `strftime(${ISO_MONTH},'now')`)
    // CURRENT_DATE [- INTERVAL ...]
    .replace(new RegExp(`CURRENT_DATE(${INTERVAL.source})?`, 'gi'), (_m, _g, sign, n, unit) =>
      sign ? `strftime(${ISO_DAY},'now','${modifier(sign, n, unit)}')` : `strftime(${ISO_DAY},'now')`)
    // NOW() [± INTERVAL ...]
    .replace(new RegExp(`NOW\\(\\)(${INTERVAL.source})?`, 'gi'), (_m, _g, sign, n, unit) =>
      sign ? `strftime(${ISO},'now','${modifier(sign, n, unit)}')` : `strftime(${ISO},'now')`)
    .replace(/\bILIKE\b/gi, 'LIKE')
    // x::float / x::numeric -> force floating-point division; other casts are no-ops in SQLite
    .replace(/::\s*(float|double precision|numeric|real)\b/gi, ' * 1.0')
    .replace(/::\s*(text|int|integer|bigint|date|timestamptz?)\b/gi, '');
  q = q.trim().replace(/;+\s*$/, '');
  return { query: q, params: ordered };
}

const sqlClient: Db['sql'] = async ({ query, params }) => {
  if (!/^\s*(with|select)\b/i.test(query)) throw new ApiError({ code: 'BAD_REQUEST', message: 'Only SELECT queries are allowed' });
  const t = translateSql(query, params);
  const cursor = runtime().sql.exec(t.query, ...t.params);
  const all = cursor.toArray();
  const rows = all.slice(0, SQL_ROW_CAP);
  return {
    rows,
    columns: cursor.columnNames.map((name) => ({ name, originalName: name })),
    rowCount: rows.length,
    truncated: all.length > SQL_ROW_CAP,
  };
};

export const db = Object.fromEntries([...TABLES.map((t) => [t.key, createTableClient(t)]), ['sql', sqlClient]]) as unknown as Db;
