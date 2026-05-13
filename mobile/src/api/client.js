import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

async function authHeader() {
  const token = await SecureStore.getItemAsync('cc.token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, options);
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return body;
}

export async function apiGet(path) {
  const headers = await authHeader();
  return request(path, { method: 'GET', headers });
}

export async function apiPost(path, body) {
  const headers = { 'Content-Type': 'application/json', ...(await authHeader()) };
  return request(path, { method: 'POST', headers, body: JSON.stringify(body) });
}

export async function apiPut(path, body) {
  const headers = { 'Content-Type': 'application/json', ...(await authHeader()) };
  return request(path, { method: 'PUT', headers, body: JSON.stringify(body) });
}

export async function apiUploadIssue(formData) {
  const headers = await authHeader();
  const res = await fetch(`${API_URL}/issues`, {
    method: 'POST',
    headers,
    body: formData,
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error || `Upload failed (${res.status})`);
  return body;
}
