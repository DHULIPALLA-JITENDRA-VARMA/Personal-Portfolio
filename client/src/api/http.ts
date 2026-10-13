// The only place that knows how to talk to the server. Every resource module builds on this,
// so a redesigned frontend can import `src/api` unchanged.
export const API_BASE = (import.meta.env.VITE_API_BASE ?? '/api').replace(/\/$/, '');

export const UNAUTHORIZED_EVENT = 'portfolio:unauthorized';

export interface FieldIssue {
  path: string;
  message: string;
}

export class ApiError extends Error {
  status: number;
  details: FieldIssue[];
  constructor(status: number, message: string, details: FieldIssue[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
  /** Validation issues keyed by field name, for inline form errors. */
  get fields(): Record<string, string> {
    return Object.fromEntries(this.details.map((d) => [d.path.split('.')[0], d.message]));
  }
}

interface Options {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

export async function request<T>(path: string, { method = 'GET', body, signal }: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const isForm = body instanceof FormData;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  // The admin API rejects mutating requests without this header (CSRF defence).
  if (method !== 'GET') headers['x-requested-with'] = 'portfolio';

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      credentials: 'include',
      signal,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError(0, 'Network error. Check your connection and try again.');
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (res.status === 401 && path.startsWith('/admin/') && !/^\/admin\/(login|me)$/.test(path)) {
    // The session expired mid-use: let the admin shell send the user back to the login page.
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
  if (!res.ok) throw new ApiError(res.status, data?.error ?? `Request failed (${res.status})`, data?.details);
  return data as T;
}

export const get = <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal });
export const post = <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body });
export const put = <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body });
export const patch = <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body });
export const del = (path: string) => request<void>(path, { method: 'DELETE' });

export function upload<T>(path: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  return request<T>(path, { method: 'POST', body: form });
}

/** CRUD client for the simple admin list resources (`/api/admin/<name>`). */
export function adminCollection<T extends { id: number }, Input = Omit<T, 'id'>>(name: string) {
  const base = `/admin/${name}`;
  return {
    list: () => get<T[]>(base),
    create: (input: Partial<Input>) => post<T>(base, input),
    update: (id: number, input: Partial<Input>) => put<T>(`${base}/${id}`, input),
    remove: (id: number) => del(`${base}/${id}`),
    reorder: (ids: number[]) => patch<{ ok: true }>(`${base}/reorder`, { ids }),
  };
}
