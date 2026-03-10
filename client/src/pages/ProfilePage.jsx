import { useEffect, useState } from 'react'
import SectionCard from '../components/SectionCard'
import LoadingSpinner from '../components/LoadingSpinner'
import { apiFetch } from '../lib/api'
import { useAuth } from '../components/AuthProvider'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    gender: '',
    dateOfBirth: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    emergencyName: '',
    emergencyRelationship: '',
    emergencyPhone: '',
  })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  })

  const [saving, setSaving] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))
  const setPw = (field) => (e) => setPasswordForm((prev) => ({ ...prev, [field]: e.target.value }))

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await apiFetch('/auth/profile')
        const u = data.user
        const p = data.profile

        setProfile(p)
        setForm({
          fullName: u.fullName || '',
          phone: u.phone || '',
          gender: p?.gender || '',
          dateOfBirth: p?.dateOfBirth ? new Date(p.dateOfBirth).toISOString().split('T')[0] : '',
          addressLine1: p?.address?.line1 || '',
          addressLine2: p?.address?.line2 || '',
          city: p?.address?.city || '',
          state: p?.address?.state || '',
          postalCode: p?.address?.postalCode || '',
          emergencyName: p?.emergencyContact?.name || '',
          emergencyRelationship: p?.emergencyContact?.relationship || '',
          emergencyPhone: p?.emergencyContact?.phone || '',
        })
      } catch (err) {
        toast.error(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  const handleSaveProfile = async (e) => {
    e.preventDefault()

    if (!form.fullName.trim()) { toast.error('Full name is required'); return }
    if (!form.phone.trim()) { toast.error('Mobile number is required'); return }

    const cleanPhone = form.phone.replace(/^(\+91|91|0)/, '').trim()
    if (!/^\d{10}$/.test(cleanPhone)) {
      toast.error('Enter a valid 10-digit mobile number')
      return
    }

    setSaving(true)
    try {
      const body = {
        fullName: form.fullName,
        phone: cleanPhone,
      }

      // Patient-only fields
      if (user.role === 'patient') {
        if (form.gender) body.gender = form.gender
        if (form.dateOfBirth) body.dateOfBirth = form.dateOfBirth
        body.address = {
          line1: form.addressLine1,
          line2: form.addressLine2,
          city: form.city,
          state: form.state,
          postalCode: form.postalCode,
        }
        body.emergencyContact = {
          name: form.emergencyName,
          relationship: form.emergencyRelationship,
          phone: form.emergencyPhone,
        }
      }

      const data = await apiFetch('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      setProfile(data.profile)
      toast.success('Profile updated')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()

    if (!passwordForm.currentPassword) { toast.error('Current password is required'); return }
    if (!passwordForm.newPassword) { toast.error('New password is required'); return }
    if (passwordForm.newPassword.length < 6) { toast.error('New password must be at least 6 characters'); return }
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) { toast.error('Passwords do not match'); return }

    setSavingPassword(true)
    try {
      await apiFetch('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      })
      setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' })
      toast.success('Password changed successfully')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) return <LoadingSpinner message="Loading profile..." />

  const isPatient = user?.role === 'patient'
  const isDoctor = user?.role === 'doctor'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white/70 p-4 ring-1 ring-ink/10">
        <div>
          <h1 className="font-display text-xl font-semibold">My Profile</h1>
          <p className="text-sm text-ink/60">Manage your personal information and account settings</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal/10 font-display text-xl font-bold text-teal">
            {(form.fullName || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold">{form.fullName || user?.email}</p>
            <p className="text-xs text-ink/50 capitalize">{user?.role}</p>
            {isPatient && profile?.patientCode && (
              <p className="font-mono text-[10px] text-ink/40">{profile.patientCode}</p>
            )}
            {isDoctor && profile?.doctorCode && (
              <p className="font-mono text-[10px] text-ink/40">{profile.doctorCode}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Left: Personal Info */}
        <SectionCard title="Personal Information" eyebrow="Profile">
          <form onSubmit={handleSaveProfile} className="space-y-4 rounded-2xl bg-white/70 p-5 ring-1 ring-ink/10">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-ink/70">Full Name *</label>
                <input
                  type="text"
                  required
                  className="mt-1.5 block w-full rounded-xl border-0 p-3 text-sm ring-1 ring-inset ring-ink/10 focus:ring-2 focus:ring-ink bg-white"
                  value={form.fullName}
                  onChange={set('fullName')}
                />
              </div>
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
                    className="block w-full rounded-r-xl border-0 p-3 text-sm ring-1 ring-inset ring-ink/10 focus:ring-2 focus:ring-ink bg-white"
                    value={form.phone}
                    onChange={set('phone')}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-ink/70">Email</label>
                <input
                  type="email"
                  disabled
                  className="mt-1.5 block w-full rounded-xl border-0 p-3 text-sm ring-1 ring-inset ring-ink/10 bg-canvas/50 text-ink/50 cursor-not-allowed"
                  value={user?.email || ''}
                />
                <p className="mt-1 text-[10px] text-ink/40">Email cannot be changed</p>
              </div>
              {isPatient && (
                <div>
                  <label className="block text-xs font-medium text-ink/70">Gender</label>
                  <select
                    className="mt-1.5 block w-full rounded-xl border-0 p-3 text-sm ring-1 ring-inset ring-ink/10 focus:ring-2 focus:ring-ink bg-white"
                    value={form.gender}
                    onChange={set('gender')}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>
              )}
            </div>

            {isPatient && (
              <div>
                <label className="block text-xs font-medium text-ink/70">Date of Birth</label>
                <input
                  type="date"
                  className="mt-1.5 block w-full rounded-xl border-0 p-3 text-sm ring-1 ring-inset ring-ink/10 focus:ring-2 focus:ring-ink bg-white sm:max-w-xs"
                  value={form.dateOfBirth}
                  onChange={set('dateOfBirth')}
                />
              </div>
            )}

            {isDoctor && profile && (
              <div className="rounded-xl bg-canvas/50 p-3 space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/40">Doctor Info (managed by admin)</p>
                <p className="text-sm"><span className="text-ink/50">Specialization:</span> {profile.specialization}</p>
                <p className="text-sm"><span className="text-ink/50">Department:</span> {profile.departmentId?.name || 'N/A'}</p>
                <p className="text-sm"><span className="text-ink/50">Room:</span> {profile.consultationRoom || 'N/A'}</p>
              </div>
            )}

            {/* Address — patient only */}
            {isPatient && (
              <>
                <div className="border-t border-ink/5 pt-4">
                  <p className="text-xs font-semibold text-ink/50 mb-3">Address</p>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Address line 1"
                      className="block w-full rounded-xl border-0 p-3 text-sm ring-1 ring-inset ring-ink/10 focus:ring-2 focus:ring-ink bg-white"
                      value={form.addressLine1}
                      onChange={set('addressLine1')}
                    />
                    <input
                      type="text"
                      placeholder="Address line 2"
                      className="block w-full rounded-xl border-0 p-3 text-sm ring-1 ring-inset ring-ink/10 focus:ring-2 focus:ring-ink bg-white"
                      value={form.addressLine2}
                      onChange={set('addressLine2')}
                    />
                    <div className="grid gap-3 sm:grid-cols-3">
                      <input
                        type="text"
                        placeholder="City"
                        className="rounded-xl border-0 p-3 text-sm ring-1 ring-inset ring-ink/10 focus:ring-2 focus:ring-ink bg-white"
                        value={form.city}
                        onChange={set('city')}
                      />
                      <input
                        type="text"
                        placeholder="State"
                        className="rounded-xl border-0 p-3 text-sm ring-1 ring-inset ring-ink/10 focus:ring-2 focus:ring-ink bg-white"
                        value={form.state}
                        onChange={set('state')}
                      />
                      <input
                        type="text"
                        placeholder="PIN code"
                        className="rounded-xl border-0 p-3 text-sm ring-1 ring-inset ring-ink/10 focus:ring-2 focus:ring-ink bg-white"
                        value={form.postalCode}
                        onChange={set('postalCode')}
                      />
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="border-t border-ink/5 pt-4">
                  <p className="text-xs font-semibold text-ink/50 mb-3">Emergency Contact</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <input
                      type="text"
                      placeholder="Contact name"
                      className="rounded-xl border-0 p-3 text-sm ring-1 ring-inset ring-ink/10 focus:ring-2 focus:ring-ink bg-white"
                      value={form.emergencyName}
                      onChange={set('emergencyName')}
                    />
                    <input
                      type="text"
                      placeholder="Relationship"
                      className="rounded-xl border-0 p-3 text-sm ring-1 ring-inset ring-ink/10 focus:ring-2 focus:ring-ink bg-white"
                      value={form.emergencyRelationship}
                      onChange={set('emergencyRelationship')}
                    />
                    <input
                      type="tel"
                      placeholder="Contact phone"
                      className="rounded-xl border-0 p-3 text-sm ring-1 ring-inset ring-ink/10 focus:ring-2 focus:ring-ink bg-white"
                      value={form.emergencyPhone}
                      onChange={set('emergencyPhone')}
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-ink px-6 py-2.5 text-sm font-semibold text-white hover:bg-ink/90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </SectionCard>

        {/* Right: Change Password */}
        <SectionCard title="Change Password" eyebrow="Security">
          <form onSubmit={handleChangePassword} className="space-y-4 rounded-2xl bg-white/70 p-5 ring-1 ring-ink/10">
            <div>
              <label className="block text-xs font-medium text-ink/70">Current Password *</label>
              <input
                type="password"
                required
                className="mt-1.5 block w-full rounded-xl border-0 p-3 text-sm ring-1 ring-inset ring-ink/10 focus:ring-2 focus:ring-ink bg-white"
                placeholder="Enter current password"
                value={passwordForm.currentPassword}
                onChange={setPw('currentPassword')}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink/70">New Password *</label>
              <input
                type="password"
                required
                minLength={6}
                className="mt-1.5 block w-full rounded-xl border-0 p-3 text-sm ring-1 ring-inset ring-ink/10 focus:ring-2 focus:ring-ink bg-white"
                placeholder="Min 6 characters"
                value={passwordForm.newPassword}
                onChange={setPw('newPassword')}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink/70">Confirm New Password *</label>
              <input
                type="password"
                required
                className="mt-1.5 block w-full rounded-xl border-0 p-3 text-sm ring-1 ring-inset ring-ink/10 focus:ring-2 focus:ring-ink bg-white"
                placeholder="Re-enter new password"
                value={passwordForm.confirmNewPassword}
                onChange={setPw('confirmNewPassword')}
              />
            </div>
            <button
              type="submit"
              disabled={savingPassword}
              className="w-full rounded-xl bg-coral px-4 py-2.5 text-sm font-semibold text-white hover:bg-coral/90 disabled:opacity-50"
            >
              {savingPassword ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </SectionCard>
      </div>
    </div>
  )
}
