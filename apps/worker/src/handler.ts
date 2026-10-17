import { ENDPOINTS } from './registry';
import { ApiError, STATUS_BY_CODE } from './runtime/backend';
import { createSessionToken, getAdminPassword, verifySessionToken } from './runtime/auth';
import { runtime } from './runtime/context';

const json = (data: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra } });

const errorBody = (status: number, message: string) => ({
  statusCode: status,
  error: status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : status === 404 ? 'Not Found' : status === 429 ? 'Too Many Requests' : status >= 500 ? 'Internal Server Error' : 'Bad Request',
  message,
});

// ── Rate limiting (stored in the same SQLite database) ─────────────────────
function hit(bucket: string, max: number, windowSec: number): boolean {
  const { sql } = runtime();
  const now = Date.now();
  sql.exec('DELETE FROM "_rate_limit" WHERE "at" < ?', now - 24 * 3600_000).toArray();
  const count = Number(sql.exec('SELECT COUNT(*) AS c FROM "_rate_limit" WHERE "bucket" = ? AND "at" > ?', bucket, now - windowSec * 1000).toArray()[0]?.c ?? 0);
  return count >= max;
}
const record = (bucket: string) => runtime().sql.exec('INSERT INTO "_rate_limit" ("bucket","at") VALUES (?,?)', bucket, Date.now()).toArray();
const clear = (bucket: string) => runtime().sql.exec('DELETE FROM "_rate_limit" WHERE "bucket" = ?', bucket).toArray();

const clientIp = (req: Request) => req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || 'unknown';

type ZodLike = { name: string; issues: { path: (string | number)[]; message: string }[] };
/** Duck-typed so it works even if several copies of zod end up in the bundle. */
const isZodError = (e: unknown): e is ZodLike => !!e && (e as ZodLike).name === 'ZodError' && Array.isArray((e as ZodLike).issues);

// ── Endpoint execution ──────────────────────────────────────────────────────
function takesSessionToken(name: string, schema: unknown): boolean {
  if (name === 'adminLogin') return false;
  const shape = (schema as { shape?: Record<string, unknown> } | undefined)?.shape;
  return !!shape && Object.prototype.hasOwnProperty.call(shape, 'password');
}

async function callEndpoint(name: string, request: Request): Promise<Response> {
  const ep = ENDPOINTS[name];
  if (!ep) return json(errorBody(404, `Unknown endpoint "${name}"`), 404);

  let body: { inputs?: Record<string, unknown> };
  try { body = (await request.json()) as typeof body; } catch { return json(errorBody(400, 'Request body must be JSON'), 400); }
  const inputs: Record<string, unknown> = { ...(body?.inputs ?? {}) };

  const ip = clientIp(request);
  const loginBucket = `login:${ip}`;

  try {
    if (name === 'adminLogin' && hit(loginBucket, 10, 15 * 60)) {
      throw new ApiError({ code: 'RATE_LIMITED', message: 'Too many login attempts. Try again in 15 minutes.' });
    }

    // Admin endpoints carry a signed session token in `password`; swap in the real
    // secret server-side so endpoint code keeps its simple equality check.
    if (takesSessionToken(name, ep.inputSchema)) {
      if (!(await verifySessionToken(inputs.password))) {
        throw new ApiError({ code: 'UNAUTHORIZED', message: 'Session expired or invalid. Please log in again.' });
      }
      inputs.password = getAdminPassword();
    }

    const input = ep.inputSchema ? ep.inputSchema.parse(inputs) : inputs;
    const output = await ep.execute({ input, context: { user: null } });

    if (name === 'adminLogin') {
      clear(loginBucket);
      return json({ ...(output as object), sessionToken: await createSessionToken() });
    }
    return json(output ?? {});
  } catch (err) {
    if (name === 'adminLogin' && err instanceof ApiError && err.code === 'UNAUTHORIZED') record(loginBucket);
    if (isZodError(err)) {
      const first = err.issues[0];
      return json(errorBody(400, `Invalid input${first ? `: ${first.path.join('.') || 'body'} — ${first.message}` : ''}`), 400);
    }
    if (err instanceof ApiError) {
      const status = STATUS_BY_CODE[err.code] ?? 500;
      return json(errorBody(status, err.userFacingMessage ?? err.message), status);
    }
    console.error(`[${name}]`, err instanceof Error ? err.stack : err);
    return json(errorBody(500, 'Internal server error'), 500);
  }
}

// ── File uploads (stored in SQLite, served from /files/:id) ────────────────
const MAX_UPLOAD_BYTES = 1_500_000;
const ALLOWED_MIME = /^(image\/(png|jpe?g|webp|gif|avif|svg\+xml)|application\/pdf)$/i;

async function upload(request: Request): Promise<Response> {
  const ip = clientIp(request);
  if (hit(`upload:${ip}`, 30, 3600)) return json(errorBody(429, 'Too many uploads. Please try again later.'), 429);
  let form: FormData;
  try { form = await request.formData(); } catch { return json(errorBody(400, 'Expected multipart form data with a "file" field'), 400); }
  const file = form.get('file') as unknown as File | string | null;
  if (!file || typeof file === 'string') return json(errorBody(400, 'Missing "file" field'), 400);
  if (file.size > MAX_UPLOAD_BYTES) return json(errorBody(400, `File too large (max ${(MAX_UPLOAD_BYTES / 1e6).toFixed(1)} MB)`), 400);
  const mime = file.type || 'application/octet-stream';
  if (!ALLOWED_MIME.test(mime)) return json(errorBody(400, 'Only images and PDF files are allowed'), 400);
  const id = crypto.randomUUID();
  const data = new Uint8Array(await file.arrayBuffer());
  runtime().sql.exec('INSERT INTO "_files" ("id","name","mime","size","data","created_at") VALUES (?,?,?,?,?,?)', id, file.name.slice(0, 200), mime, data.byteLength, data, new Date().toISOString()).toArray();
  record(`upload:${ip}`);
  return json({ fileUrl: `${new URL(request.url).origin}/files/${id}` });
}

function serveFile(id: string): Response {
  const row = runtime().sql.exec('SELECT "name","mime","data" FROM "_files" WHERE "id" = ?', id).toArray()[0];
  if (!row) return new Response('Not found', { status: 404 });
  const mime = String(row.mime);
  return new Response(row.data as ArrayBuffer, {
    headers: {
      'Content-Type': mime,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
      'Content-Disposition': `inline; filename="${String(row.name).replace(/[^\w.\- ]/g, '_')}"`,
    },
  });
}

export async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (request.method === 'GET' && path === '/api/health') return json({ ok: true, service: 'earninghub-api', time: new Date().toISOString() });
  if (request.method === 'POST' && path.startsWith('/api/')) return callEndpoint(decodeURIComponent(path.slice(5)), request);
  if (request.method === 'POST' && path === '/upload') return upload(request);
  if (request.method === 'GET' && path.startsWith('/files/')) return serveFile(decodeURIComponent(path.slice(7)));
  return json(errorBody(404, 'Not found'), 404);
}
