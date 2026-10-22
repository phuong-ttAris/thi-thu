// Dev: để trống (Vite proxy). Production: URL backend, đặt qua VITE_API_URL lúc build.
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const KEY = 'thi-thu-token';

export function getToken() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}
export function setToken(token) {
  try { if (token) localStorage.setItem(KEY, token); else localStorage.removeItem(KEY); } catch { /* chế độ riêng tư: chỉ đăng nhập trong phiên */ }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

export async function api(path, { method = 'GET', body } = {}) {
  const token = getToken();
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers['content-type'] = 'application/json';
  let res;
  try {
    res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new Error('Không kết nối được máy chủ');
  }
  const data = await res.json().catch(() => ({}));
  // Token hết hạn/bị thu hồi: về màn đăng nhập.
  if (res.status === 401 && token) { setToken(null); onUnauthorized(); }
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}
