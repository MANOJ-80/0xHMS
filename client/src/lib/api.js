const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'

export function getToken() {
  return localStorage.getItem('accessToken') || ''
}

export function clearAuth() {
  localStorage.removeItem('accessToken')
}

export async function apiFetch(path, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  // Handle 401 — token is invalid or expired
  if (response.status === 401 && token) {
    clearAuth()
    // Redirect to login if not already there
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
    throw new Error('Session expired. Please log in again.')
  }

  const payload = await response.json().catch(() => ({
    success: false,
    message: `Server error (${response.status})`,
  }))

  if (!response.ok) {
    const error = new Error(payload.message || 'Request failed')
    error.status = response.status
    error.errors = payload.errors || []
    throw error
  }

  return payload.data
}
