/**
 * Minimal typed RPC client for the EarningHub API.
 * Every endpoint is `POST {API_URL}/api/<name>` with `{ inputs }` and returns the endpoint output as JSON.
 */
export const API_URL: string = ((import.meta.env.VITE_API_URL as string | undefined) || '').replace(/\/+$/, '');

export function createCaller<TInput, TOutput>(name: string) {
  return async (input?: TInput): Promise<TOutput> => {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/api/${name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: input ?? {} }),
      });
    } catch {
      throw new Error('Network error: could not reach the server');
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      let message = text;
      try {
        message = (JSON.parse(text) as { message?: string }).message ?? text;
      } catch {
        /* body was not JSON */
      }
      throw new Error(`API call failed (${res.status}): ${message}`);
    }
    return (await res.json()) as TOutput;
  };
}
