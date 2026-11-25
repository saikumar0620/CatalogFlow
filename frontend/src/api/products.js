const API = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '')
const TOKEN_KEY = 'catalogflow_token'
const REFRESH_TOKEN_KEY = 'catalogflow_refresh_token'

let refreshPromise = null

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || ''
}

export function setTokens(accessToken, refreshToken) {
  if (accessToken) {
    localStorage.setItem(TOKEN_KEY, accessToken)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
  if (refreshToken !== undefined) {
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY)
    }
  }
}

export function setToken(token) {
  setTokens(token, token ? undefined : '')
}

async function parseErrorMessage(response) {
  const type = response.headers.get('content-type') || ''
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
  return message
}

export async function refreshAccessToken() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    throw new Error('No refresh token available')
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        })
        if (!response.ok) {
          setTokens('', '')
          const err = new Error(await parseErrorMessage(response))
          err.status = response.status
          throw err
        }
        const data = await response.json()
        setTokens(data.access_token, data.refresh_token)
        return data.access_token
      } finally {
        refreshPromise = null
      }
    })()
  }

  return refreshPromise
}

export async function request(path, options = {}) {
  const { _retried = false, ...fetchOptions } = options
  const token = getToken()
  const headers = new Headers(fetchOptions.headers || {})
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API}${path}`, { ...fetchOptions, headers })

  if (
    response.status === 401 &&
    !_retried &&
    path !== '/auth/login' &&
    path !== '/auth/refresh' &&
    getRefreshToken()
  ) {
    try {
      const nextToken = await refreshAccessToken()
      const retryHeaders = new Headers(fetchOptions.headers || {})
      retryHeaders.set('Authorization', `Bearer ${nextToken}`)
      return request(path, { ...fetchOptions, headers: retryHeaders, _retried: true })
    } catch {
      // Fall through and surface the 401 error
    }
  }

  if (!response.ok) {
    const err = new Error(await parseErrorMessage(response))
    err.status = response.status
    throw err
  }

  const type = response.headers.get('content-type') || ''
  return type.includes('application/json') ? response.json() : response.text()
}

export async function loginUser(username, password) {
  const body = new URLSearchParams({ username, password })
  const data = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  setTokens(data.access_token, data.refresh_token)
  return data
}

export async function registerUser({ name, email, password, confirmPassword }) {
  const data = await request('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      email,
      password,
      confirm_password: confirmPassword,
    }),
  })
  setTokens(data.access_token, data.refresh_token)
  return data
}

export async function logoutUser() {
  const refreshToken = getRefreshToken()
  setTokens('', '')
  if (!refreshToken) return
  try {
    await fetch(`${API}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
  } catch {
    // Best-effort revocation; local tokens are already cleared
  }
}

export function fetchCurrentUser() {
  return request('/auth/me')
}
