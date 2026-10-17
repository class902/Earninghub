export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

/** Throw from an endpoint to fail with a specific HTTP status. */
export class ApiError extends Error {
  code: ApiErrorCode;
  userFacingMessage?: string;
  constructor(options: { code: ApiErrorCode; message: string; userFacingMessage?: string });
  constructor(message: string, code?: ApiErrorCode);
  constructor(a: string | { code: ApiErrorCode; message: string; userFacingMessage?: string }, b?: ApiErrorCode) {
    super(typeof a === 'string' ? a : a.message);
    this.name = 'ApiError';
    this.code = typeof a === 'string' ? b ?? 'INTERNAL_ERROR' : a.code;
    if (typeof a !== 'string') this.userFacingMessage = a.userFacingMessage;
  }
}

type SchemaLike<TOut, TIn = TOut> = {
  _output: TOut;
  _input: TIn;
  parse: (data: unknown) => TOut;
};

export interface EndpointContext {
  /** Present for future authenticated endpoints; admin auth is handled by the API router. */
  user: null;
}

export interface EndpointConfig<TInput = unknown, TOutput = unknown, TRawInput = TInput> {
  description?: string;
  inputSchema?: SchemaLike<TInput, TRawInput>;
  /** Documentation only — never validated. */
  outputSchema?: SchemaLike<unknown>;
  execute: (params: { input: TInput; context: EndpointContext }) => Promise<TOutput> | TOutput;
}

export function createEndpoint<TInput = unknown, TOutput = unknown, TRawInput = TInput>(
  config: EndpointConfig<TInput, TOutput, TRawInput>,
): EndpointConfig<TInput, TOutput, TRawInput> {
  return config;
}
