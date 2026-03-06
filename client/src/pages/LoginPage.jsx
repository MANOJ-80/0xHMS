import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthProvider'
import AlertBanner from '../components/AlertBanner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const loggedInUser = await login(email, password)
      // Role-based redirect
      const dest =
        loggedInUser.role === 'patient' ? '/patient-dashboard' :
        loggedInUser.role === 'doctor' ? '/doctor-dashboard' :
        '/'
      navigate(dest, { replace: true })
    } catch (err) {
      setError(err.message || 'Failed to login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-mesh px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-[28px] border border-white/50 bg-white/75 p-8 shadow-panel backdrop-blur">
        <div>
          <h2 className="mt-6 text-center font-display text-3xl font-bold tracking-tight text-ink">
            Sign in to your account
          </h2>
        </div>
        
        {error && (
          <AlertBanner variant="error" message={error} onDismiss={() => setError('')} />
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full rounded-2xl border-0 p-3 py-3 text-ink ring-1 ring-inset ring-ink/10 placeholder:text-ink/40 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-ink sm:text-sm sm:leading-6"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="relative block w-full rounded-2xl border-0 p-3 py-3 text-ink ring-1 ring-inset ring-ink/10 placeholder:text-ink/40 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-ink sm:text-sm sm:leading-6"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-2xl bg-ink px-3 py-3 text-sm font-semibold text-white hover:bg-ink/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
        <div className="mt-4 text-center text-sm text-ink/60">
          <p>Hint: Run <code className="bg-ink/5 px-1 rounded">npm run seed</code> to create test users.</p>
        </div>
      </div>
    </div>
  )
}
