const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

async function request(path, options) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: options?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Request failed');
  return data;
}

export const menuApi = {
  list: (category) => request(`/api/menu${category ? `?category=${encodeURIComponent(category)}` : ''}`),
  create: (item) => request('/api/menu', { method: 'POST', body: JSON.stringify(item) }),
  update: (itemId, changes) =>
    request(`/api/menu/${itemId}`, { method: 'PUT', body: JSON.stringify(changes) }),
  remove: (itemId) => request(`/api/menu/${itemId}`, { method: 'DELETE' }),
};
