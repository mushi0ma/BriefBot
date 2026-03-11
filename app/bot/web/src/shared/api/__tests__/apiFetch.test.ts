import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createApiFetch, ApiError } from '../apiFetch';

describe('createApiFetch', () => {
  const initData = 'test-init-data';
  let apiFetch: ReturnType<typeof createApiFetch>;

  beforeEach(() => {
    apiFetch = createApiFetch(initData);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should add Authorization and Content-Type headers', async () => {
    const mockResponse = new Response(JSON.stringify({ ok: true }), { status: 200 });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    await apiFetch('/api/test');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'test-init-data',
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('should return response on success (2xx)', async () => {
    const body = { briefs: [] };
    const mockResponse = new Response(JSON.stringify(body), { status: 200 });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    const res = await apiFetch('/api/history');
    const data = await res.json();
    expect(data).toEqual(body);
  });

  it('should throw ApiError on 401 Unauthorized', async () => {
    const mockResponse = new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, statusText: 'Unauthorized' }
    );
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    await expect(apiFetch('/api/settings')).rejects.toThrow(ApiError);
    await expect(apiFetch('/api/settings')).rejects.toMatchObject({
      status: 401,
      message: expect.stringContaining('401'),
    });
  });

  it('should throw ApiError on 500 Internal Server Error', async () => {
    const mockResponse = new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, statusText: 'Internal Server Error' }
    );
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    await expect(apiFetch('/api/history')).rejects.toThrow(ApiError);
    await expect(apiFetch('/api/history')).rejects.toMatchObject({
      status: 500,
    });
  });

  it('should pass AbortController signal for timeout', async () => {
    const mockResponse = new Response('{}', { status: 200 });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    await apiFetch('/api/test');

    const callArgs = vi.mocked(globalThis.fetch).mock.calls[0];
    const opts = callArgs[1] as RequestInit;
    // Verify that an AbortSignal is attached for timeout
    expect(opts.signal).toBeInstanceOf(AbortSignal);
  });

  it('should merge custom headers with defaults', async () => {
    const mockResponse = new Response('{}', { status: 200 });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    await apiFetch('/api/test', {
      headers: { 'X-Custom': 'value' },
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'test-init-data',
          'Content-Type': 'application/json',
          'X-Custom': 'value',
        }),
      })
    );
  });

});

describe('ApiError', () => {
  it('should be an instance of Error', () => {
    const err = new ApiError(404, 'Not Found');
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(404);
    expect(err.message).toBe('API Error 404: Not Found');
  });
});
