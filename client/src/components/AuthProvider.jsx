import { createContext, useContext, useEffect, useState } from 'react'
import { apiFetch, getToken } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      const token = getToken()
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const data = await apiFetch('/auth/me')
        setUser(data.user)
      } catch (err) {
        localStorage.removeItem('accessToken')
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (email, password) => {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    
    localStorage.setItem('accessToken', data.tokens.accessToken)
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    localStorage.removeItem('accessToken')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
