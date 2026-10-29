const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api-backend';

type FetchOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
};

export async function api(endpoint: string, options: FetchOptions = {}) {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store', // Disable caching to ensure fresh data (like config)
  });

  const data = await res.json();

  if (!res.ok) {
    if (data.requiresOtp) {
      return data;
    }
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

// Convenience wrappers
export const apiGet = (endpoint: string, token?: string | null) =>
  api(endpoint, { token });

export const apiPost = (endpoint: string, body: unknown, token?: string | null) =>
  api(endpoint, { method: 'POST', body, token });

export const apiPut = (endpoint: string, body: unknown, token?: string | null) =>
  api(endpoint, { method: 'PUT', body, token });

