/**
 * Authenticated fetch wrapper for TMA API calls.
 * Adds Authorization header with Telegram initData.
 */
export function createApiFetch(initData: string) {
  return async (path: string, opts: RequestInit = {}) =>
    fetch(path, {
      ...opts,
      headers: {
        Authorization: initData,
        "Content-Type": "application/json",
        ...opts.headers,
      },
    });
}
