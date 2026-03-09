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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const endpoint = user?.role === 'admin' ? '/reports/dashboard' : '/reports/overview'

    Promise.all([
      apiFetch(endpoint),
      apiFetch('/appointments').catch(() => ({ appointments: [] })),
      apiFetch('/notifications').catch(() => ({ notifications: [] })),
    ])
      .then(([reportData, aptData, notifData]) => {
        setOverview(reportData.overview)
        if (user?.role === 'admin') setDashboard(reportData)
        setRecentAppointments((aptData.appointments || []).slice(0, 5))
        setRecentNotifications((notifData.notifications || []).slice(0, 5))
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [user])

  const metrics = [
    { label: 'Checked in today', value: overview?.checkedInToday ?? '--', color: 'bg-teal/10 text-teal', ring: 'ring-teal/20' },
    { label: 'Avg. wait time', value: overview ? `${overview.averageWaitMinutes}m` : '--', color: 'bg-coral/10 text-coral', ring: 'ring-coral/20' },
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

      {/* Doctor availability (admin only) */}
      {user?.role === 'admin' && dashboard?.doctorsByAvailability && (
        <SectionCard title="Doctor Availability" eyebrow="Staff status">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {dashboard.doctorsByAvailability.map((stat) => (
              <div key={stat._id} className="flex items-center gap-4 rounded-2xl bg-white/70 p-4 ring-1 ring-ink/10">
                <StatusBadge status={stat._id} />
                <span className="font-display text-2xl font-semibold">{stat.count}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

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
    </div>
  )
}
