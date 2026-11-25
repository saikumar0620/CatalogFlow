const API = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '')
const TOKEN_KEY = 'catalogflow_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export async function request(path, options = {}) {
  const token = getToken()
  const headers = new Headers(options.headers || {})
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API}${path}`, { ...options, headers })
  const type = response.headers.get('content-type') || ''

  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      if (type.includes('application/json')) {
        const data = await response.json()
        message = data.detail || message
      } else {
        const text = await response.text()
        if (text) message = text
      }
    } catch {
      // Keep fallback status message
    }
    const err = new Error(message)
    err.status = response.status
    throw err
  }

  return type.includes('application/json') ? response.json() : response.text()
}

export async function loginUser(username, password) {
  const body = new URLSearchParams({ username, password })
  const data = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  setToken(data.access_token)
  return data
}

export function registerUser(username, password) {
  return request('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
}

export function fetchCurrentUser() {
  return request('/auth/me')
}
