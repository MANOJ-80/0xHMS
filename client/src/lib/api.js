const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'

// Simple in-memory cache to reduce redundant API calls on fast navigation
const cache = new Map()
const CACHE_TTL = 15000 // 15 seconds

export function getToken() {
  return localStorage.getItem('accessToken') || ''
}

export function clearAuth() {
  localStorage.removeItem('accessToken')
  cache.clear()
}

export async function apiFetch(path, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  const isGet = !options.method || options.method.toUpperCase() === 'GET'
  const cacheKey = `${token ? 'auth' : 'anon'}:${path}`

  // Return cached data for GET requests if valid
  if (isGet && !options.noCache) {
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data
    }
  } else if (!isGet) {
    // Aggressively clear cache on mutations (POST, PUT, PATCH, DELETE) to ensure data stays fresh
    cache.clear()
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

  // Save successful GET responses to cache
  if (isGet) {
    cache.set(cacheKey, { data: payload.data, timestamp: Date.now() })
  }

  return payload.data
}
