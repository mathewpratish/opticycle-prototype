const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:4000')

function saveToken(token) {
  localStorage.setItem('opticycle_token', token)
}

function getToken() {
  return localStorage.getItem('opticycle_token')
}

let guestSessionRequest

async function readResponse(response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 401) localStorage.removeItem('opticycle_token')
    throw new Error(data.error || `Request failed (${response.status})`)
  }
  return data
}

export function hasToken() {
  return !!getToken()
}

export async function startGuestSession() {
  if (getToken()) return
  if (!guestSessionRequest) {
    guestSessionRequest = fetch(`${API_BASE}/api/auth/guest`, { method: 'POST' })
      .then(readResponse)
      .then((data) => {
        if (!data.token) throw new Error('The server did not return a guest session token.')
        saveToken(data.token)
      })
      .finally(() => {
        guestSessionRequest = undefined
      })
  }
  return guestSessionRequest
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

export default { hasToken, startGuestSession, analyzeFile, getHistory }
