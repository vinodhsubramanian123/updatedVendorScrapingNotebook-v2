import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestJson } from './api.js';

function pendingUntilAbort(signal) {
  return new Promise((_resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  });
}

describe('requestJson cancellation', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reports a timeout during JSON body loading as a timeout', async () => {
    vi.stubGlobal('fetch', async (_url, { signal }) => ({
      status: 200,
      json: () => pendingUntilAbort(signal)
    }));

    await expect(requestJson('/catalog', { timeoutMs: 5 })).rejects.toMatchObject({
      name: 'TimeoutError',
      message: 'Request timed out'
    });
  });

  it('preserves cancellation by the caller', async () => {
    vi.stubGlobal('fetch', (_url, { signal }) => pendingUntilAbort(signal));
    const controller = new AbortController();
    const request = requestJson('/catalog', { signal: controller.signal });
    controller.abort();
    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
  });
});
