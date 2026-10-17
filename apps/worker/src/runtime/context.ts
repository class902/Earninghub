/** Minimal structural types so endpoint code can be type-checked without Workers typings. */
export interface SqlCursor {
  toArray(): Record<string, unknown>[];
  columnNames: string[];
  rowsWritten: number;
}
export interface SqlStorageLike {
  exec(query: string, ...bindings: unknown[]): SqlCursor;
}

export interface RuntimeEnv {
  ADMIN_PASSWORD?: string;
  SESSION_SECRET?: string;
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
  PUBLIC_APP_URL?: string;
  ALLOWED_ORIGINS?: string;
  GOOGLE_DRIVE_ACCESS_TOKEN?: string;
}

interface Runtime {
  sql: SqlStorageLike;
  env: RuntimeEnv;
}

let current: Runtime | null = null;

export function initRuntime(rt: Runtime): void {
  current = rt;
}

export function runtime(): Runtime {
  if (!current) throw new Error('API runtime is not initialised');
  return current;
}

/** Public website URL without a trailing slash. */
export function appUrl(): string {
  return (runtime().env.PUBLIC_APP_URL || '').replace(/\/+$/, '');
}
