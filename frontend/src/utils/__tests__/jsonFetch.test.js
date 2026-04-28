import { describe, expect, test, vi } from 'vitest';
import { fetchJsonWithFallback } from '../jsonFetch';

function jsonResponse(payload, init = {}) {
  return new Response(JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
    },
    status: 200,
    ...init,
  });
}

function htmlResponse() {
  return new Response('<!doctype html><html><body>SPA fallback</body></html>', {
    headers: {
      'Content-Type': 'text/html',
    },
    status: 200,
  });
}

describe('fetchJsonWithFallback', () => {
  test('continues to the next path when a 200 response is not JSON', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(htmlResponse())
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    await expect(fetchJsonWithFallback(['/missing.json', '/data.json'], { fetchImpl }))
      .resolves.toEqual({ ok: true });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  test('throws a helpful error after every candidate fails', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response('not found', { status: 404, statusText: 'Not Found' }))
      .mockResolvedValueOnce(htmlResponse());

    await expect(fetchJsonWithFallback(['/missing.json', '/spa-fallback.json'], { fetchImpl }))
      .rejects.toThrow('Failed to load JSON from fallback paths');
  });
});
