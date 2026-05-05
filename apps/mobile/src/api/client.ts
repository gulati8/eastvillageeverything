import type {
  PlacesListResponse,
  PlaceDetailResponse,
  TagsFlatResponse,
  TagsStructuredResponse,
} from '@eve/shared-types';
import { getOrCreateDeviceId } from '../identity/deviceId';
import { getApiBaseUrl, REQUEST_TIMEOUT_MS } from './config';
import { ApiError, NetworkError, TimeoutError } from './errors';

// Cached device id — resolved once on first request, reused thereafter.
let cachedDeviceId: string | null = null;

async function resolveDeviceId(): Promise<string> {
  if (cachedDeviceId !== null) return cachedDeviceId;
  cachedDeviceId = await getOrCreateDeviceId();
  return cachedDeviceId;
}

/**
 * Build a full URL from path + optional query params.
 * path must start with '/'.
 */
function buildUrl(path: string, query?: Record<string, string>): string {
  const base = getApiBaseUrl();
  const url = new URL(path, base);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

/**
 * Parse an error body JSON if possible; fall back to a default message.
 */
async function parseErrorBody(
  response: Response
): Promise<{ message: string; code: string }> {
  try {
    const body = (await response.json()) as Record<string, unknown>;
    const message =
      typeof body['error'] === 'string'
        ? body['error']
        : `HTTP ${response.status}`;
    const code =
      typeof body['code'] === 'string'
        ? body['code']
        : `HTTP_${response.status}`;
    return { message, code };
  } catch {
    return { message: `HTTP ${response.status}`, code: `HTTP_${response.status}` };
  }
}

/**
 * Core fetch wrapper. Sets X-Device-Id and Accept headers, enforces timeout,
 * normalises errors.
 */
async function request<T>(
  method: string,
  path: string,
  opts: {
    query?: Record<string, string>;
    body?: unknown;
    signal?: AbortSignal;
  } = {}
): Promise<T> {
  const deviceId = await resolveDeviceId();
  const url = buildUrl(path, opts.query);

  // Timeout via AbortController
  const timeoutController = new AbortController();
  const timeoutHandle = setTimeout(
    () => timeoutController.abort(),
    REQUEST_TIMEOUT_MS
  );

  // Combine caller-supplied signal with the timeout signal
  const callerSignal = opts.signal;
  const combinedAbort = (): void => timeoutController.abort();
  if (callerSignal) {
    callerSignal.addEventListener('abort', combinedAbort);
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Device-Id': deviceId,
  };
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: timeoutController.signal,
    });
  } catch (err) {
    if (
      (err instanceof Error && err.name === 'AbortError') ||
      timeoutController.signal.aborted
    ) {
      throw new TimeoutError();
    }
    throw new NetworkError(
      err instanceof Error ? err.message : 'Network request failed'
    );
  } finally {
    clearTimeout(timeoutHandle);
    if (callerSignal) {
      callerSignal.removeEventListener('abort', combinedAbort);
    }
  }

  if (!response.ok) {
    const { message, code } = await parseErrorBody(response);
    throw new ApiError(message, response.status, code);
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

export async function apiGet<T>(
  path: string,
  opts?: { signal?: AbortSignal; query?: Record<string, string> }
): Promise<T> {
  return request<T>('GET', path, opts);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>('POST', path, { body });
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return request<T>('PATCH', path, { body });
}

export async function apiDelete(path: string): Promise<void> {
  await request<void>('DELETE', path);
}

// ---------------------------------------------------------------------------
// Typed domain wrappers (consumed by T1.7 / T1.8)
// ---------------------------------------------------------------------------

export const placesApi = {
  list: (tag?: string): Promise<PlacesListResponse> =>
    apiGet<PlacesListResponse>(
      '/api/places',
      tag ? { query: { tag } } : undefined
    ),
  byId: (id: string): Promise<PlaceDetailResponse> =>
    apiGet<PlaceDetailResponse>(`/api/places/${encodeURIComponent(id)}`),
};

export const tagsApi = {
  flat: (): Promise<TagsFlatResponse> =>
    apiGet<TagsFlatResponse>('/api/tags'),
  structured: (): Promise<TagsStructuredResponse> =>
    apiGet<TagsStructuredResponse>('/api/tags', { query: { structured: '1' } }),
};
