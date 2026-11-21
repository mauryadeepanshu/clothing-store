const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const TOKEN_KEY = 'mfs_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details || {};
  }
}

/** Calls the backend. Throws ApiError with the server's message on failure. */
export async function api(path, { method = 'GET', body, auth = true, form } = {}) {
  const headers = {};
  const token = tokenStore.get();
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(`${API_ORIGIN}/api${path}`, { method, headers, body: payload });
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check that the backend is running.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) window.dispatchEvent(new Event('mfs:unauthorized'));
    throw new ApiError(res.status, data.message || `Request failed (${res.status})`, data.details);
  }
  return data;
}

/** Resolves uploaded image paths against the API origin. */
export const assetUrl = (url) => (url && url.startsWith('/uploads') ? `${API_ORIGIN}${url}` : url);
