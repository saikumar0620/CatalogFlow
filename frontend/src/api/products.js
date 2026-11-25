const API = import.meta.env.VITE_API_URL || '/api'

export async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, options)
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Request failed (${response.status})`)
  }
  const type = response.headers.get('content-type') || ''
  return type.includes('application/json') ? response.json() : response.text()
}
