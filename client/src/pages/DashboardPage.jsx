import { useEffect, useState } from 'react'
import SectionCard from '../components/SectionCard'
import LoadingSpinner from '../components/LoadingSpinner'
import StatusBadge from '../components/StatusBadge'
import { apiFetch } from '../lib/api'
import { useAuth } from '../components/AuthProvider'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const { user } = useAuth()
  const [overview, setOverview] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [recentAppointments, setRecentAppointments] = useState([])
  const [recentNotifications, setRecentNotifications] = useState([])
  
  // Admin staff creation state
  const [departments, setDepartments] = useState([])
  const [staffForm, setStaffForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'receptionist',
    specialization: '',
    departmentId: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Purge state
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false)
  const [purgeConfirmText, setPurgeConfirmText] = useState('')
  const [isPurging, setIsPurging] = useState(false)
  const [purgeResult, setPurgeResult] = useState(null)

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const endpoint = user?.role === 'admin' ? '/reports/dashboard' : '/reports/overview'

    Promise.all([
      user?.role !== 'admin' ? apiFetch(endpoint) : Promise.resolve({ overview: {} }),
      user?.role !== 'admin' ? apiFetch('/appointments').catch(() => ({ appointments: [] })) : Promise.resolve({ appointments: [] }),
      user?.role !== 'admin' ? apiFetch('/notifications').catch(() => ({ notifications: [] })) : Promise.resolve({ notifications: [] }),
      user?.role === 'admin' ? apiFetch('/departments').catch(() => ({ departments: [] })) : Promise.resolve({ departments: [] }),
    ])
      .then(([reportData, aptData, notifData, deptData]) => {
        if (user?.role !== 'admin') {
          setOverview(reportData.overview)
          setRecentAppointments((aptData.appointments || []).slice(0, 5))
          setRecentNotifications((notifData.notifications || []).slice(0, 5))
        }
        if (user?.role === 'admin') {
          setDepartments(deptData.departments || [])
        }
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [user])

  const handlePurge = async () => {
    if (purgeConfirmText !== 'PURGE') return
    setIsPurging(true)
    try {
      const res = await apiFetch('/maintenance/purge', { method: 'DELETE' })
      setPurgeResult(res.data?.purged || res.purged || null)
      toast.success('All transactional data purged successfully!')
      setShowPurgeConfirm(false)
      setPurgeConfirmText('')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setIsPurging(false)
    }
  }

  const metrics = [
    { label: 'Checked in today', value: overview?.checkedInToday ?? '--', color: 'bg-teal/10 text-teal', ring: 'ring-teal/20' },
    { label: 'Consultations done', value: overview?.completedConsultations ?? '--', color: 'bg-coral/10 text-coral', ring: 'ring-coral/20' },
    { label: 'Doctors active', value: overview?.doctorsActive ?? '--', color: 'bg-moss/10 text-moss', ring: 'ring-moss/20' },
    { label: 'Urgent cases', value: overview?.urgentCases ?? '--', color: 'bg-ink/10 text-ink/70', ring: 'ring-ink/10' },
  ]

  if (loading) {
    return <LoadingSpinner message="Loading dashboard..." fullPage />
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="font-display text-2xl font-semibold">
          Welcome back{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          Here is what is happening at the facility today.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className={`rounded-2xl bg-white/70 p-5 ring-1 ${m.ring}`}>
            <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${m.color}`}>
              {m.label}
            </span>
            <p className="mt-3 font-display text-3xl font-semibold">{m.value}</p>
          </div>
        ))}
      </div>


      {user?.role === 'admin' ? (
        <>
        <SectionCard title="Add New Staff" eyebrow="System Administration">
          <form 
            className="space-y-4 max-w-2xl rounded-2xl bg-white/70 p-5 ring-1 ring-ink/10"
            onSubmit={async (e) => {
              e.preventDefault()
              setIsSubmitting(true)
              try {
                await apiFetch('/auth/register-staff', {
                  method: 'POST',
                  body: JSON.stringify(staffForm)
                })
                toast.success(`${staffForm.role === 'doctor' ? 'Doctor' : 'Receptionist'} created successfully`)
                setStaffForm({ fullName: '', email: '', phone: '', password: '', role: 'receptionist', specialization: '', departmentId: '' })
              } catch (err) {
                toast.error(err.message)
              } finally {
                setIsSubmitting(false)
              }
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-ink">Role *</label>
                <select 
                  required
                  value={staffForm.role}
                  onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                  className="mt-1.5 block w-full rounded-xl border-0 p-3 text-sm ring-1 ring-inset ring-ink/10 bg-white"
                >
                  <option value="receptionist">Receptionist</option>
                  <option value="doctor">Doctor</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-ink">Full Name *</label>
                <input 
                  type="text" required
                  value={staffForm.fullName}
                  onChange={(e) => setStaffForm({ ...staffForm, fullName: e.target.value })}
                  className="mt-1.5 block w-full rounded-xl border-0 p-3 text-sm ring-1 ring-inset ring-ink/10 bg-white"
                  placeholder="e.g. Jane Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink">Email *</label>
                <input 
                  type="email" required
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  className="mt-1.5 block w-full rounded-xl border-0 p-3 text-sm ring-1 ring-inset ring-ink/10 bg-white"
                  placeholder="name@hospital.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink">Password *</label>
                <input 
                  type="password" required minLength={6}
                  value={staffForm.password}
                  onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                  className="mt-1.5 block w-full rounded-xl border-0 p-3 text-sm ring-1 ring-inset ring-ink/10 bg-white"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink">Phone</label>
                <input 
                  type="text"
                  value={staffForm.phone}
                  onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                  className="mt-1.5 block w-full rounded-xl border-0 p-3 text-sm ring-1 ring-inset ring-ink/10 bg-white"
                  placeholder="10-digit number"
                />
              </div>
            </div>

            {staffForm.role === 'doctor' && (
              <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t border-ink/10 mt-4">
                <div>
                  <label className="block text-sm font-medium text-ink">Department *</label>
                  <select 
                    required
                    value={staffForm.departmentId}
                    onChange={(e) => setStaffForm({ ...staffForm, departmentId: e.target.value })}
                    className="mt-1.5 block w-full rounded-xl border-0 p-3 text-sm ring-1 ring-inset ring-ink/10 bg-white"
                  >
                    <option value="">Select Department...</option>
                    {departments.map(d => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink">Specialization *</label>
                  <input 
                    type="text" required
                    value={staffForm.specialization}
                    onChange={(e) => setStaffForm({ ...staffForm, specialization: e.target.value })}
                    className="mt-1.5 block w-full rounded-xl border-0 p-3 text-sm ring-1 ring-inset ring-ink/10 bg-white"
                    placeholder="e.g. Cardiology"
                  />
                </div>
              </div>
            )}

            <div className="pt-4 flex justify-end">
              <button 
                type="submit" disabled={isSubmitting}
                className="rounded-xl bg-ink px-6 py-2.5 text-sm font-semibold text-white hover:bg-ink/90 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Staff Member'}
              </button>
            </div>
          </form>
        </SectionCard>

        {/* Database Maintenance */}
        <SectionCard title="Database Maintenance" eyebrow="System Administration">
          <div className="max-w-2xl rounded-2xl bg-white/70 p-5 ring-1 ring-ink/10 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-ink">Purge Transactional Data</h3>
              <p className="mt-1 text-xs text-ink/60">
                This will permanently delete all appointments, queue tokens, check-ins, consultations, 
                prescriptions, doctor assignments, notifications, and audit logs. 
                Users, doctors, patients, departments, and system configurations will be preserved.
              </p>
            </div>

            {purgeResult && (
              <div className="rounded-xl bg-moss/5 p-4 ring-1 ring-moss/20">
                <p className="text-xs font-semibold text-moss mb-2">✓ Last purge results:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(purgeResult).map(([col, count]) => (
                    <div key={col} className="text-xs text-ink/70">
                      <span className="font-medium">{col}:</span> {count} deleted
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!showPurgeConfirm ? (
              <button
                id="purge-data-btn"
                onClick={() => setShowPurgeConfirm(true)}
                className="rounded-xl bg-coral/10 px-5 py-2.5 text-sm font-semibold text-coral ring-1 ring-coral/20 hover:bg-coral/20 transition-colors"
              >
                🗑️ Purge All Data
              </button>
            ) : (
              <div className="rounded-xl bg-coral/5 p-4 ring-1 ring-coral/20 space-y-3">
                <p className="text-sm font-semibold text-coral">
                  ⚠️ This action cannot be undone!
                </p>
                <p className="text-xs text-ink/60">
                  Type <span className="font-mono font-bold text-coral">PURGE</span> below to confirm:
                </p>
                <input
                  id="purge-confirm-input"
                  type="text"
                  value={purgeConfirmText}
                  onChange={(e) => setPurgeConfirmText(e.target.value.toUpperCase())}
                  placeholder="Type PURGE to confirm"
                  className="block w-full max-w-xs rounded-xl border-0 p-3 text-sm ring-1 ring-inset ring-coral/20 bg-white font-mono"
                />
                <div className="flex gap-3">
                  <button
                    id="purge-confirm-btn"
                    onClick={handlePurge}
                    disabled={purgeConfirmText !== 'PURGE' || isPurging}
                    className="rounded-xl bg-coral px-5 py-2.5 text-sm font-semibold text-white hover:bg-coral/90 disabled:opacity-40 transition-colors"
                  >
                    {isPurging ? 'Purging...' : 'Confirm Purge'}
                  </button>
                  <button
                    id="purge-cancel-btn"
                    onClick={() => { setShowPurgeConfirm(false); setPurgeConfirmText('') }}
                    className="rounded-xl bg-ink/5 px-5 py-2.5 text-sm font-semibold text-ink/70 hover:bg-ink/10 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </SectionCard>
        </>
      ) : (
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent appointments */}
        <SectionCard title="Recent Appointments" eyebrow="Scheduling">
          {recentAppointments.length === 0 ? (
            <p className="py-4 text-center text-sm text-ink/50">No recent appointments.</p>
          ) : (
            <div className="space-y-2">
              {recentAppointments.map((apt) => (
                <div key={apt._id} className="flex items-center justify-between rounded-xl bg-white/70 p-3 ring-1 ring-ink/5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{apt.patientId?.fullName || 'Unknown'}</p>
                    <p className="text-xs text-ink/50">
                      {new Date(apt.slotStart).toLocaleDateString()} {new Date(apt.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {apt.doctorId?.fullName ? ` - Dr. ${apt.doctorId.fullName}` : ''}
                    </p>
                  </div>
                  <StatusBadge status={apt.status} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Recent notifications */}
        <SectionCard title="Recent Notifications" eyebrow="Communication">
          {recentNotifications.length === 0 ? (
            <p className="py-4 text-center text-sm text-ink/50">No recent notifications.</p>
          ) : (
            <div className="space-y-2">
              {recentNotifications.map((n) => (
                <div key={n._id} className="flex items-center justify-between rounded-xl bg-white/70 p-3 ring-1 ring-ink/5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {n.type?.replace(/_/g, ' ') || 'Notification'}
                    </p>
                    <p className="text-xs text-ink/50 truncate">
                      {n.patientId?.fullName || 'Unknown'} &middot; {n.channel}
                    </p>
                  </div>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                    n.status === 'sent' ? 'bg-moss/10 text-moss' : n.status === 'failed' ? 'bg-coral/10 text-coral' : 'bg-sand/40 text-ink/70'
                  }`}>
                    {n.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
      )}
    </div>
  )
}

