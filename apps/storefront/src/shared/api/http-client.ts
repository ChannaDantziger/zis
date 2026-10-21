const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('לא ניתן להתחבר לחנות. נסו שוב בעוד רגע.', 0, 'NETWORK_ERROR');
  }
  const payload = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    const details = payload && typeof payload === 'object' && 'error' in payload
      ? payload.error as { code?: string; requestId?: string } : undefined;
    throw new ApiError('לא ניתן להשלים את הבקשה. נסו שוב.', response.status,
      details?.code ?? 'REQUEST_FAILED', details?.requestId ?? response.headers.get('X-Request-Id') ?? undefined);
  }
  if (payload === null) throw new ApiError('התקבלה תשובה לא תקינה מהחנות.', response.status, 'INVALID_RESPONSE');
  return payload as T;
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code: string,
    public readonly requestId?: string) {
    super(message);
    this.name = 'ApiError';
  }
}
