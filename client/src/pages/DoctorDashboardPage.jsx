import { useEffect, useState } from 'react'
import SectionCard from '../components/SectionCard'
import StatusBadge from '../components/StatusBadge'
import AlertBanner from '../components/AlertBanner'
import LoadingSpinner from '../components/LoadingSpinner'
import { apiFetch } from '../lib/api'
import { useAuth } from '../components/AuthProvider'
import { useQueuePolling } from '../lib/useQueuePolling'

export default function DoctorDashboardPage() {
  const { user } = useAuth()
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeConsultation, setActiveConsultation] = useState(null)
  const [consultationNotes, setConsultationNotes] = useState('')

  const doctorId = user?.linkedDoctorId

  const fetchQueue = async () => {
    if (!doctorId) return
    try {
      const data = await apiFetch(`/doctors/${doctorId}/queue`)
      setQueue(data.queue)

      const inConsultation = data.queue.find(q => q.queueStatus === 'in_consultation')
      if (inConsultation && !activeConsultation) {
        apiFetch(`/consultations?doctorId=${doctorId}&status=in_consultation`)
          .then(res => {
            if (res.consultations?.length > 0) {
              setActiveConsultation(res.consultations[0])
            }
          }).catch(console.error)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQueue()
  }, [doctorId])

  // Real-time: Socket.IO in dev, polling fallback on Vercel
  useQueuePolling(fetchQueue, { room: 'doctor', ids: doctorId })

  const startConsultation = async (tokenId) => {
    try {
      const data = await apiFetch('/consultations/start', {
        method: 'POST',
        body: JSON.stringify({ queueTokenId: tokenId })
      })
      setActiveConsultation(data.consultation)
      fetchQueue()
    } catch (err) {
      setError(err.message)
    }
  }

  const finishConsultation = async () => {
    if (!activeConsultation) return
    try {
      await apiFetch(`/consultations/${activeConsultation._id}/complete`, {
        method: 'PATCH',
        body: JSON.stringify({ consultationNotes })
      })
      setActiveConsultation(null)
      setConsultationNotes('')
      fetchQueue()
    } catch (err) {
      setError(err.message)
    }
  }

  if (user?.role !== 'doctor' && user?.role !== 'admin') {
    return <div className="p-8 text-center text-ink/60">Doctor access required.</div>
  }

  if (!doctorId) {
    return <div className="p-8 text-center text-ink/60">No doctor profile linked to this user.</div>
  }

  const activeQueue = queue.filter(q => q.queueStatus !== 'completed')

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <SectionCard title="My Queue" eyebrow="Waiting Patients">
        <AlertBanner variant="error" message={error} onDismiss={() => setError('')} />

        {loading ? (
          <LoadingSpinner message="Loading queue..." />
        ) : activeQueue.length === 0 ? (
          <p className="py-8 text-center text-ink/60">No patients in queue.</p>
        ) : (
          <div className="space-y-4">
            {activeQueue.map((item, idx) => (
              <div key={item._id} className="flex items-center justify-between rounded-3xl bg-white/70 p-5 ring-1 ring-ink/10">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-teal/10 font-display text-xl font-bold text-teal">
                    {item.tokenNumber.split('-').pop()}
                  </div>
                  <div>
                    <h4 className="font-semibold text-ink">{item.patientId?.fullName || 'Unknown'}</h4>
                    <p className="text-sm text-ink/60">Wait time: {item.estimatedWaitMinutes}m</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={item.priorityLevel} />
                  {item.queueStatus === 'in_consultation' ? (
                    <StatusBadge status="in_consultation" label="In Session" />
                  ) : idx === 0 && !activeConsultation ? (
                    <button
                      onClick={() => startConsultation(item._id)}
                      className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-ink/90"
                    >
                      Call Next
                    </button>
                  ) : (
                    <StatusBadge status={item.queueStatus} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Active Consultation" eyebrow="Session">
        {activeConsultation ? (
          <div className="space-y-6 rounded-3xl bg-white/70 p-6 ring-1 ring-coral/20">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-coral"></span>
              </span>
              <h3 className="font-display text-xl text-coral">Consultation in progress</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink">Clinical Notes</label>
              <textarea
                rows={6}
                className="mt-2 block w-full rounded-xl border-0 p-3 text-ink ring-1 ring-inset ring-ink/10 bg-white"
                value={consultationNotes}
                onChange={e => setConsultationNotes(e.target.value)}
                placeholder="Type examination notes, prescriptions..."
              />
            </div>

            <button
              onClick={finishConsultation}
              className="w-full rounded-2xl bg-coral px-4 py-3 text-sm font-semibold text-white hover:bg-coral/90"
            >
              Complete Consultation
            </button>
          </div>
        ) : (
          <div className="flex h-full min-h-[200px] items-center justify-center rounded-3xl border border-dashed border-ink/10 bg-white/30 text-ink/60">
            No active consultation
          </div>
        )}
      </SectionCard>
    </div>
  )
}
