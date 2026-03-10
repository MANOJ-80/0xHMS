import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthProvider'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
    gender: 'prefer_not_to_say',
  })
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.fullName.trim()) { toast.error('Full name is required'); return }
    if (!form.email.trim()) { toast.error('Email is required'); return }
    if (!form.phone.trim()) { toast.error('Mobile number is required'); return }

    const cleanPhone = form.phone.replace(/^(\+91|91|0)/, '').trim()
    if (!/^\d{10}$/.test(cleanPhone)) {
      toast.error('Enter a valid 10-digit Indian mobile number')
      return
    }

    if (!form.dateOfBirth) { toast.error('Date of birth is required'); return }
    if (!form.password) { toast.error('Password is required'); return }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return }

    setLoading(true)
    try {
      await register({
        fullName: form.fullName,
        email: form.email,
        phone: cleanPhone,
        password: form.password,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
      })
      toast.success('Account created! Welcome to SPCMS.')
      navigate('/patient-dashboard', { replace: true })
    } catch (err) {
      toast.error(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-mesh px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-white/50 bg-white/80 p-8 shadow-panel backdrop-blur">
        {/* Brand */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-teal text-white font-display font-bold text-lg">
            SP
          </div>
          <h2 className="mt-4 font-display text-2xl font-semibold text-ink">
            Create your account
          </h2>
          <p className="mt-1 text-sm text-ink/50">Register as a patient on SPCMS</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-medium text-ink/70">Full Name *</label>
            <input
              type="text"
              required
              className="mt-1.5 block w-full rounded-xl border-0 p-3 text-sm text-ink ring-1 ring-inset ring-ink/10 placeholder:text-ink/35 focus:ring-2 focus:ring-inset focus:ring-ink bg-white"
              placeholder="John Doe"
              value={form.fullName}
              onChange={set('fullName')}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-ink/70">Email *</label>
            <input
              type="email"
              required
              className="mt-1.5 block w-full rounded-xl border-0 p-3 text-sm text-ink ring-1 ring-inset ring-ink/10 placeholder:text-ink/35 focus:ring-2 focus:ring-inset focus:ring-ink bg-white"
              placeholder="you@example.com"
              value={form.email}
              onChange={set('email')}
            />
          </div>

          {/* Mobile Number */}
          <div>
            <label className="block text-xs font-medium text-ink/70">Mobile Number *</label>
            <div className="mt-1.5 flex">
              <span className="inline-flex items-center rounded-l-xl border-0 bg-canvas px-3 text-sm text-ink/50 ring-1 ring-inset ring-ink/10">
                +91
              </span>
              <input
                type="tel"
                required
                maxLength={10}
                className="block w-full rounded-r-xl border-0 p-3 text-sm text-ink ring-1 ring-inset ring-ink/10 placeholder:text-ink/35 focus:ring-2 focus:ring-inset focus:ring-ink bg-white"
                placeholder="9876543210"
                value={form.phone}
                onChange={set('phone')}
              />
            </div>
            <p className="mt-1 text-[10px] text-ink/40">Used for SMS notifications and appointment reminders</p>
          </div>

          {/* DOB + Gender row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-ink/70">Date of Birth *</label>
              <input
                type="date"
                required
                className="mt-1.5 block w-full rounded-xl border-0 p-3 text-sm text-ink ring-1 ring-inset ring-ink/10 focus:ring-2 focus:ring-inset focus:ring-ink bg-white"
                value={form.dateOfBirth}
                onChange={set('dateOfBirth')}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink/70">Gender</label>
              <select
                className="mt-1.5 block w-full rounded-xl border-0 p-3 text-sm text-ink ring-1 ring-inset ring-ink/10 focus:ring-2 focus:ring-inset focus:ring-ink bg-white"
                value={form.gender}
                onChange={set('gender')}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-ink/70">Password *</label>
            <input
              type="password"
              required
              minLength={6}
              className="mt-1.5 block w-full rounded-xl border-0 p-3 text-sm text-ink ring-1 ring-inset ring-ink/10 placeholder:text-ink/35 focus:ring-2 focus:ring-inset focus:ring-ink bg-white"
              placeholder="Min 6 characters"
              value={form.password}
              onChange={set('password')}
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-medium text-ink/70">Confirm Password *</label>
            <input
              type="password"
              required
              className="mt-1.5 block w-full rounded-xl border-0 p-3 text-sm text-ink ring-1 ring-inset ring-ink/10 placeholder:text-ink/35 focus:ring-2 focus:ring-inset focus:ring-ink bg-white"
              placeholder="Re-enter password"
              value={form.confirmPassword}
              onChange={set('confirmPassword')}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-ink/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-ink/50">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-teal hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
