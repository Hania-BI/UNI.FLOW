import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
const TIMEOUT_MS = 15_000;

console.log('[API] base URL:', API_URL);

async function authHeader() {
  const token = await SecureStore.getItemAsync('cc.token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const url = `${API_URL}${path}`;
  console.log(`[API] ${options.method || 'GET'} ${url}`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const text = await res.text();

    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      console.error('[API] Non-JSON response:', text.slice(0, 200));
      throw new Error(`Server returned an unexpected response (${res.status}). Is the backend running?`);
    }

    console.log(`[API] ${res.status}`, body);

    if (!res.ok) {
      throw new Error(body?.error || `Request failed (${res.status})`);
    }
    return body;
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('[API] Request timed out:', url);
      throw new Error(
        `Request timed out after ${TIMEOUT_MS / 1000}s.\n\nCheck that:\n• The backend is running (npm run dev in /backend)\n• EXPO_PUBLIC_API_URL in mobile/.env points to your machine's IP on port 3000`
      );
    }
    if (err.message.includes('Network request failed') || err.message.includes('fetch')) {
      console.error('[API] Network error:', err.message);
      throw new Error(
        `Cannot reach the server at ${API_URL}.\n\nCheck that:\n• The backend is running\n• Your device and computer are on the same Wi-Fi\n• EXPO_PUBLIC_API_URL is your machine's IP (not localhost)`
      );
    }
    console.error('[API] Request error:', err.message);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function apiGet(path) {
  const headers = await authHeader();
  return request(path, { method: 'GET', headers });
}

export async function apiPost(path, body, options = {}) {
  const headers = await authHeader();

  let finalBody = body;

  if (options.isFormData) {
    delete headers['Content-Type'];
  } else {
    headers['Content-Type'] = 'application/json';
    finalBody = JSON.stringify(body);
  }

  return request(path, {
    method: 'POST',
    headers,
    body: finalBody,
  });
}

export async function apiPut(path, body) {
  const headers = { 'Content-Type': 'application/json', ...(await authHeader()) };
  return request(path, { method: 'PUT', headers, body: JSON.stringify(body) });
}

export async function apiDelete(path) {
  const headers = await authHeader();
  return request(path, { method: 'DELETE', headers });
}

export async function apiUpload(path, formData) {
  const url = `${API_URL}${path}`;
  console.log('[API] POST (upload)', url);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);

  try {
    const headers = await authHeader();
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      signal: controller.signal,
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body?.error || `Upload failed (${res.status})`);
    return body;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Upload timed out. Check your connection.');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export function apiUploadIssue(formData) {
  return apiUpload('/issues', formData);
}
