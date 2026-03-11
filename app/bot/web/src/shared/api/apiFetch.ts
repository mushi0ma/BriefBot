/**
 * Authenticated fetch wrapper for TMA API calls.
 * Adds Authorization header with Telegram initData.
 *
 * Resilience features:
 * - AbortController timeout (10s default)
 * - Throws ApiError on non-2xx responses (fail fast)
 */

const DEFAULT_TIMEOUT_MS = 10_000;

export class ApiError extends Error {
  public readonly status: number;

  constructor(status: number, statusText: string) {
    super(`API Error ${status}: ${statusText}`);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function createApiFetch(initData: string) {
  return async (path: string, opts: RequestInit = {}): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(path, {
        ...opts,
        signal: opts.signal ?? controller.signal,
        headers: {
          Authorization: initData,
          'Content-Type': 'application/json',
          ...opts.headers,
        },
      });

      if (!response.ok) {
        throw new ApiError(response.status, response.statusText);
      }

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  };
}
