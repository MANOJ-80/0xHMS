import { useEffect, useState } from 'react'
import SectionCard from '../components/SectionCard'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import AlertBanner from '../components/AlertBanner'
import { apiFetch } from '../lib/api'

export default function PatientsPage() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/patients')
      .then((data) => setPatients(data.patients || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <SectionCard title="Patient directory" eyebrow="Records">
      <AlertBanner variant="error" message={error} onDismiss={() => setError('')} />

      {loading ? (
        <LoadingSpinner message="Loading patients..." />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-ink/10 bg-white/70 shadow-sm">
          <table className="min-w-full divide-y divide-ink/10 text-left text-sm">
            <thead className="bg-sand/35 text-ink/70">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10 bg-white/70">
              {patients.length > 0 ? patients.map((patient) => (
                <tr key={patient._id} className="hover:bg-sand/10">
                  <td className="px-4 py-4">{patient.fullName}</td>
                  <td className="px-4 py-4">{patient.phone || 'N/A'}</td>
                  <td className="px-4 py-4">{patient.email || 'N/A'}</td>
                  <td className="px-4 py-4">
                    <StatusBadge status={patient.isActive ? 'active' : 'inactive'} />
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-ink/60">No patients found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  )
}
