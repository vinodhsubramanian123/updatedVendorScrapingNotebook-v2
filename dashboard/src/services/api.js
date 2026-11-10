/** Decode the server's error envelope consistently; HTTP failures never count as success. */
export function apiErrorMessage(data, fallback = 'Request failed') {
  const error = data?.error;
  if (typeof error === 'string') return error;
  return error?.message || data?.message || fallback;
}

export async function requestJson(url, options = {}) {
  const { timeoutMs = 30000, signal, ...fetchOptions } = options;
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, timeoutMs);
  try {
    const response = await fetch(url, { ...fetchOptions, signal: controller.signal });
    let data;
    try { data = await response.json(); } catch {
      throw new Error(`HTTP ${response.status}: Server returned an invalid JSON response`);
    }
    if (!response.ok) throw new Error(apiErrorMessage(data, `HTTP ${response.status}`));
    return data;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

export function postJson(url, body, options = {}) {
  return requestJson(url, {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    body: JSON.stringify(body)
  });
}

export async function uploadBoqFile(file) {
  const extension = file.name?.split('.').pop()?.toLowerCase();
  const supported = ['xlsx', 'xls', 'csv', 'tsv', 'json', 'txt', 'pdf', 'png', 'jpg', 'jpeg', 'webp'];
  if (!supported.includes(extension)) throw new Error('Unsupported BOQ file format');
  const ocr = ['pdf', 'png', 'jpg', 'jpeg', 'webp'].includes(extension);
  const limit = ocr ? 25 : 50;
  if (file.size > limit * 1024 * 1024) throw new Error(`This file exceeds the ${limit}MB upload limit`);
  const formData = new FormData();
  formData.append('boqFile', file);
  const result = await requestJson('/api/upload-boq', { method: 'POST', body: formData, timeoutMs: 120000 });
  if (!result.filepath) throw new Error('Upload response did not identify the uploaded file');
  return result;
}
