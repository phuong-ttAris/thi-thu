// Dev: để trống (Vite proxy). Production: URL backend, đặt qua VITE_API_URL lúc build.
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const KEY = 'thi-thu-token';

export function getToken() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}
export function setToken(token) {
  try { if (token) localStorage.setItem(KEY, token); else localStorage.removeItem(KEY); } catch { /* chế độ riêng tư: chỉ đăng nhập trong phiên */ }
}

// Đề (không có đáp án, giống nhau cho mọi người) lưu ở localStorage để mở lại trang hiện ngay.
// shortcut: localStorage giới hạn ~5MB và đọc đồng bộ; đề lên tới vài MB thì chuyển sang IndexedDB.
const BANK_KEY = 'thi-thu-bank';
export function getSavedBank() {
  try {
    const bank = JSON.parse(localStorage.getItem(BANK_KEY));
    return Array.isArray(bank) ? bank : null; // dữ liệu hỏng thì coi như chưa có cache
  } catch { return null; }
}
export function saveBank(bank) {
  try { localStorage.setItem(BANK_KEY, JSON.stringify(bank)); } catch { /* đầy hoặc bị chặn: chỉ mất cache */ }
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
