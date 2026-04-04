import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SectionCard from '../components/SectionCard'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import { apiFetch } from '../lib/api'
import toast from 'react-hot-toast'

export default function DoctorsPage() {
  const navigate = useNavigate()
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    apiFetch('/doctors')
      .then((data) => setDoctors(data.doctors || []))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all'
    ? doctors
    : doctors.filter(d => d.availabilityStatus === filter)

  const counts = {
    all: doctors.length,
    available: doctors.filter(d => d.availabilityStatus === 'available').length,
    busy: doctors.filter(d => d.availabilityStatus === 'busy').length,
    on_break: doctors.filter(d => d.availabilityStatus === 'on_break').length,
    offline: doctors.filter(d => d.availabilityStatus === 'offline').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold">Doctors</h1>
        <div className="flex flex-wrap gap-2">
          {Object.entries(counts).map(([key, count]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition ${
                filter === key
                  ? 'bg-ink text-white'
                  : 'bg-white text-ink/60 ring-1 ring-ink/10 hover:text-ink'
              }`}
            >
              {key.replace(/_/g, ' ')} ({count})
            </button>
          ))}
        </div>
      </div>

      <SectionCard title="Doctor Roster" eyebrow={`${filtered.length} doctor${filtered.length !== 1 ? 's' : ''}`}>
        {loading ? (
          <LoadingSpinner message="Loading doctors..." />
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-ink/50">No doctors found.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((doctor) => (
              <div
                key={doctor._id}
                onClick={() => navigate(`/doctors/${doctor._id}`)}
                className="rounded-2xl bg-white/70 p-5 ring-1 ring-ink/10 transition hover:shadow-sm hover:ring-teal/30 cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Dr. {doctor.fullName}</h3>
                    <p className="mt-0.5 text-xs text-ink/50">{doctor.specialization || 'General Practice'}</p>
                  </div>
                  <StatusBadge status={doctor.availabilityStatus || 'offline'} />
                </div>

                <div className="mt-4 flex items-center gap-4 text-xs text-ink/50">
                  <span>Room: {doctor.consultationRoom || 'TBD'}</span>
                  {doctor.maxQueueThreshold && (
                    <span>Max queue: {doctor.maxQueueThreshold}</span>
                  )}
                </div>

                {doctor.departmentId && (
                  <p className="mt-2 text-xs text-ink/40">
                    Dept: {doctor.departmentId?.name || doctor.departmentId}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
