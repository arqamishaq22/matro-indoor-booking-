const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://matro-indoor-booking-indol.vercel.app').replace(/\/+$/, '');

export async function apiRequest(path, options = {}) {
  const { token, onUnauthorized, headers: requestHeaders, ...fetchOptions } = options;
  const authToken = token ?? sessionStorage.getItem('matro-auth-token');
  const headers = {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...requestHeaders,
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers,
  });

  let json;

  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok) {
    const error = new Error(json?.message ?? `HTTP ${response.status}`);
    error.status = response.status;
    error.body = json;
    error.errors = json?.errors ?? null;
    if (response.status === 401) onUnauthorized?.(error);
    throw error;
  }

  if (!json) throw new Error('Invalid server response');
  return json.data ?? json;
}
