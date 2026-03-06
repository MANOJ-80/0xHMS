import { useEffect, useState } from 'react'
import SectionCard from '../components/SectionCard'
import LoadingSpinner from '../components/LoadingSpinner'
import AlertBanner from '../components/AlertBanner'
import { apiFetch } from '../lib/api'
import { useAuth } from '../components/AuthProvider'

const lanes = [
  { name: 'Booking control', text: 'Manage fixed slots, cancellations, and schedule drift from one dashboard.' },
  { name: 'Live queueing', text: 'Track checked-in patients, urgent overrides, and estimated wait changes in real time.' },
  { name: 'Doctor balancing', text: 'Route walk-ins to the most suitable available doctor with clear assignment history.' },
]

export default function DashboardPage() {
  const { user } = useAuth()
  const [overview, setOverview] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const endpoint = user?.role === 'admin' ? '/reports/dashboard' : '/reports/overview'

    apiFetch(endpoint)
      .then((data) => {
        setOverview(data.overview)
        if (user?.role === 'admin') setDashboard(data)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [user])

  const metrics = [
    { label: 'Patients checked in', value: overview?.checkedInToday ?? '--', tone: 'bg-teal/10 text-teal' },
    { label: 'Avg. wait time', value: overview ? `${overview.averageWaitMinutes} min` : '--', tone: 'bg-coral/10 text-coral' },
    { label: 'Doctors active', value: overview?.doctorsActive ?? '--', tone: 'bg-moss/10 text-moss' },
    { label: 'Urgent cases', value: overview?.urgentCases ?? '--', tone: 'bg-ink/10 text-ink' },
  ]

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
      <SectionCard title="Operational pulse" eyebrow="Today at a glance">
        <AlertBanner variant="error" message={error} onDismiss={() => setError('')} />

        {loading ? (
          <LoadingSpinner message="Loading dashboard..." />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => (
                <div key={metric.label} className="rounded-3xl bg-canvas/70 p-4 ring-1 ring-ink/5">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${metric.tone}`}>
                    {metric.label}
                  </span>
                  <p className="mt-4 font-display text-3xl font-semibold">{metric.value}</p>
                </div>
              ))}
            </div>

            {user?.role === 'admin' && dashboard?.doctorsByAvailability && (
              <div className="mt-6 rounded-3xl bg-white/70 p-5 ring-1 ring-ink/10">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-ink/50 mb-4">Doctor Availability Breakdown</h4>
                <div className="flex gap-4">
                  {dashboard.doctorsByAvailability.map(stat => (
                    <div key={stat._id} className="flex-1 rounded-2xl bg-canvas/50 p-4 text-center">
                      <p className="text-2xl font-display font-semibold">{stat.count}</p>
                      <p className="text-xs font-medium text-ink/70 capitalize">{stat._id}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {lanes.map((lane) => (
                <article key={lane.name} className="rounded-3xl bg-ink p-5 text-white">
                  <h3 className="font-display text-xl">{lane.name}</h3>
                  <p className="mt-3 text-sm leading-7 text-white/75">{lane.text}</p>
                </article>
              ))}
            </div>
          </>
        )}
      </SectionCard>

      <SectionCard title="System Logs" eyebrow="Activity">
        <div className="space-y-4">
          <p className="text-sm text-ink/70 mb-4">Core workflows are active. The assignment engine and queue board receive automatic real-time updates.</p>
          {[
            'Auth context mapped with persistent JWTs.',
            'Patient self-service portal launched.',
            'Live queueing with automatic updates established.',
            'Doctor dashboards showing live consultation states.',
          ].map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-2xl bg-canvas/80 p-4 text-sm leading-7 text-ink/80 ring-1 ring-ink/5">
              <div className="h-2 w-2 rounded-full bg-moss"></div>
              {item}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
