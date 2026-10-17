import { DurableObject } from 'cloudflare:workers';
import { handleRequest } from './handler';
import { initRuntime, type RuntimeEnv } from './runtime/context';
import { migrate } from './runtime/migrate';

/** Single SQLite-backed Durable Object that owns all application data and runs every endpoint. */
export class ApiDatabase extends DurableObject<RuntimeEnv> {
  constructor(ctx: DurableObjectState, env: RuntimeEnv) {
    super(ctx, env);
    initRuntime({ sql: ctx.storage.sql as never, env });
    ctx.blockConcurrencyWhile(async () => migrate(ctx.storage.sql as never));
  }

  async fetch(request: Request): Promise<Response> {
    return handleRequest(request);
  }
}
