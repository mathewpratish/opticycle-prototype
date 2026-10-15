const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

function saveToken(token) {
  localStorage.setItem('opticycle_token', token)
}

function getToken() {
  return localStorage.getItem('opticycle_token')
}

async function readResponse(response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 401) logout()
    throw new Error(data.error || `Request failed (${response.status})`)
  }
  return data
}

function saveAuthResponse(data) {
  if (!data.token) throw new Error('The server did not return an authentication token.')
  saveToken(data.token)
  return data
}

export async function register(email, password) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return saveAuthResponse(await readResponse(res))
}

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return saveAuthResponse(await readResponse(res))
}

export async function analyzeFile(file) {
  const token = getToken()
  const fd = new FormData()
  fd.append('image', file)
  const res = await fetch(`${API_BASE}/api/scan/analyze`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  })
  return readResponse(res)
}

export async function getHistory() {
  const token = getToken()
  const res = await fetch(`${API_BASE}/api/scan/history`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await readResponse(res)
  if (!Array.isArray(data.scans)) throw new Error('The server returned invalid scan history.')
  return data
}

export function logout() {
  localStorage.removeItem('opticycle_token')
}

export default { register, login, analyzeFile, getHistory, logout }
