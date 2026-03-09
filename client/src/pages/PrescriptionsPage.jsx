import { useEffect, useState } from 'react'
import SectionCard from '../components/SectionCard'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import Pagination from '../components/Pagination'
import { apiFetch } from '../lib/api'
import { useAuth } from '../components/AuthProvider'
import toast from 'react-hot-toast'

const PAGE_SIZE = 10

export default function PrescriptionsPage() {
  const { user } = useAuth()
  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)

  const patientId = user?.linkedPatientId

  useEffect(() => {
    fetchPrescriptions()
  }, [])

  const fetchPrescriptions = async () => {
    try {
      let url = '/prescriptions'
      if (user?.role === 'patient' && patientId) {
        url = `/prescriptions/patient/${patientId}`
      }
      const data = await apiFetch(url)
      setPrescriptions(data.prescriptions || [])
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(prescriptions.length / PAGE_SIZE)
  const paginated = prescriptions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <SectionCard title="Prescriptions" eyebrow="Medical records">
        {loading ? (
          <LoadingSpinner message="Loading prescriptions..." />
        ) : paginated.length === 0 ? (
          <p className="py-8 text-center text-ink/60">No prescriptions found.</p>
        ) : (
          <>
            <div className="space-y-3">
              {paginated.map(rx => (
                <button
                  key={rx._id}
                  onClick={() => setSelected(rx)}
                  className={`w-full rounded-2xl bg-white/70 p-4 text-left ring-1 transition hover:shadow-sm ${
                    selected?._id === rx._id ? 'ring-teal/40 shadow-sm' : 'ring-ink/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs text-ink/50">{rx.prescriptionNumber}</p>
                      <p className="mt-1 text-sm font-medium text-ink truncate">
                        {rx.diagnosis || 'No diagnosis noted'}
                      </p>
                      <p className="mt-0.5 text-xs text-ink/50">
                        {rx.patientId?.fullName || 'Unknown'} &middot; Dr. {rx.doctorId?.fullName || 'Unknown'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <StatusBadge status={rx.status || 'active'} />
                      <span className="text-[10px] text-ink/40">{new Date(rx.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {rx.medicines && rx.medicines.length > 0 && (
                    <p className="mt-2 text-xs text-ink/50">
                      {rx.medicines.length} medicine{rx.medicines.length > 1 ? 's' : ''} prescribed
                    </p>
                  )}
                </button>
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </SectionCard>

      {/* Detail panel */}
      <SectionCard title="Prescription Details" eyebrow="Selected record">
        {selected ? (
          <div className="space-y-5 rounded-2xl bg-white/70 p-5 ring-1 ring-ink/10">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-xs text-ink/50">{selected.prescriptionNumber}</p>
                <p className="mt-1 text-lg font-display font-semibold text-ink">
                  {selected.diagnosis || 'No diagnosis'}
                </p>
              </div>
              <StatusBadge status={selected.status || 'active'} />
            </div>

            {/* Patient & Doctor */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">Patient</p>
                <p className="mt-1 text-sm">{selected.patientId?.fullName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">Doctor</p>
                <p className="mt-1 text-sm">Dr. {selected.doctorId?.fullName || 'N/A'}</p>
              </div>
            </div>

            {/* Medicines */}
            {selected.medicines && selected.medicines.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink/50 mb-3">Medicines</p>
                <div className="space-y-2">
                  {selected.medicines.map((med, i) => (
                    <div key={i} className="rounded-xl bg-canvas/50 p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-ink">{med.medicineName}</p>
                          <p className="text-xs text-ink/50">{med.dosage} &middot; {med.frequency} &middot; {med.duration}</p>
                        </div>
                        {med.route && (
                          <span className="rounded-full bg-teal/10 px-2 py-0.5 text-[10px] font-semibold text-teal">
                            {med.route}
                          </span>
                        )}
                      </div>
                      {med.specialInstructions && (
                        <p className="mt-1 text-xs text-ink/60 italic">{med.specialInstructions}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Treatment notes */}
            {selected.treatmentNotes && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">Treatment Notes</p>
                <p className="mt-1 rounded-xl bg-canvas/50 p-3 text-sm leading-6 text-ink/80">
                  {selected.treatmentNotes}
                </p>
              </div>
            )}

            {/* Follow-up */}
            {selected.followUp && (
              <div className="rounded-xl bg-teal/5 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-teal">Follow-up</p>
                {selected.followUp.required && (
                  <p className="mt-1 text-sm text-ink">
                    {selected.followUp.date
                      ? `Scheduled: ${new Date(selected.followUp.date).toLocaleDateString()}`
                      : 'Follow-up recommended'}
                  </p>
                )}
                {selected.followUp.notes && (
                  <p className="mt-1 text-xs text-ink/60">{selected.followUp.notes}</p>
                )}
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-ink/5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">Created</p>
                <p className="mt-1 text-sm">{new Date(selected.createdAt).toLocaleString()}</p>
              </div>
              {selected.updatedAt !== selected.createdAt && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">Updated</p>
                  <p className="mt-1 text-sm">{new Date(selected.updatedAt).toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-ink/10 bg-white/30 text-sm text-ink/50">
            Select a prescription to view details
          </div>
        )}
      </SectionCard>
    </div>
  )
}
