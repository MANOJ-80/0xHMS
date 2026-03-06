import { useEffect, useState } from 'react'
import SectionCard from '../components/SectionCard'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import AlertBanner from '../components/AlertBanner'
import { apiFetch } from '../lib/api'

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/doctors')
      .then((data) => setDoctors(data.doctors || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <SectionCard title="Doctor Roster" eyebrow="Staff">
      <AlertBanner variant="error" message={error} onDismiss={() => setError('')} />

      {loading ? (
        <LoadingSpinner message="Loading doctors..." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {doctors.length > 0 ? doctors.map((doctor) => (
            <div key={doctor._id} className="rounded-3xl bg-white/70 p-5 ring-1 ring-ink/10">
              <h3 className="font-display text-xl font-semibold">{doctor.fullName}</h3>
              <p className="mt-1 text-sm text-ink/60">{doctor.specialization || 'General Practice'}</p>

              <div className="mt-4 flex items-center gap-2">
                <StatusBadge status={doctor.availabilityStatus || 'offline'} />
                <span className="text-xs text-ink/60">
                  Room: {doctor.consultationRoom || 'TBD'}
                </span>
              </div>
            </div>
          )) : (
            <p className="col-span-full py-8 text-center text-ink/60">No doctors found.</p>
          )}
        </div>
      )}
    </SectionCard>
  )
}
