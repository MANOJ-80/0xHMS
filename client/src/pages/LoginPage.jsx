import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthProvider'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!email.trim()) { toast.error('Email is required'); return }
    if (!password) { toast.error('Password is required'); return }

    setLoading(true)

    try {
      const loggedInUser = await login(email, password)
      const dest =
        loggedInUser.role === 'patient' ? '/patient-dashboard' :
        loggedInUser.role === 'doctor' ? '/doctor-dashboard' :
        '/'
      toast.success('Welcome back!')
      navigate(dest, { replace: true })
    } catch (err) {
      toast.error(err.message || 'Failed to login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-mesh px-4 py-12">
        <div className="w-full max-w-sm space-y-6 rounded-2xl border border-white/50 bg-white/80 p-8 shadow-panel backdrop-blur">
          {/* Brand */}
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-teal text-white font-display font-bold text-lg">
              SP
            </div>
            <h2 className="mt-4 font-display text-2xl font-semibold text-ink">
              Sign in to SPCMS
            </h2>
            <p className="mt-1 text-sm text-ink/50">Smart Patient Consultation Management</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email-address" className="block text-xs font-medium text-ink/70">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1.5 block w-full rounded-xl border-0 p-3 text-sm text-ink ring-1 ring-inset ring-ink/10 placeholder:text-ink/35 focus:ring-2 focus:ring-inset focus:ring-ink bg-white"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-ink/70">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="mt-1.5 block w-full rounded-xl border-0 p-3 text-sm text-ink ring-1 ring-inset ring-ink/10 placeholder:text-ink/35 focus:ring-2 focus:ring-inset focus:ring-ink bg-white"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-ink/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
