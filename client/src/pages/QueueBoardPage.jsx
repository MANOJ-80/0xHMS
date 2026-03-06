import { useEffect, useState } from 'react'
import SectionCard from '../components/SectionCard'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import AlertBanner from '../components/AlertBanner'
import { apiFetch } from '../lib/api'
import { useQueuePolling } from '../lib/useQueuePolling'

export default function QueueBoardPage() {
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [departmentIds, setDepartmentIds] = useState([])

  const fetchQueue = () => {
    apiFetch('/queue/board')
      .then((data) => setQueue(data.queue))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  // Load departments for Socket.IO room joining
  useEffect(() => {
    fetchQueue()
    apiFetch('/departments')
      .then((data) => {
        if (data.departments) {
          setDepartmentIds(data.departments.map((d) => d._id))
        }
      })
      .catch((err) => console.error(err))
  }, [])

  // Real-time: Socket.IO in dev, polling fallback on Vercel
  useQueuePolling(fetchQueue, { room: 'department', ids: departmentIds })

  return (
    <SectionCard title="Live queue board" eyebrow="Realtime visibility">
      <AlertBanner variant="error" message={error} onDismiss={() => setError('')} />

      {loading ? (
        <LoadingSpinner message="Loading queue..." />
      ) : queue.length === 0 ? (
        <p className="py-8 text-center text-ink/60">No active tokens in the queue.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {queue.map((item) => (
            <article key={item._id} className="rounded-3xl bg-white/70 p-5 ring-1 ring-ink/10">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal">Token</p>
                  <h3 className="mt-2 font-display text-3xl font-semibold">{item.tokenNumber}</h3>
                </div>
                <StatusBadge status={item.queueStatus} />
              </div>
              <p className="mt-5 text-sm text-ink/75">{item.assignedDoctorId?.fullName || 'Awaiting doctor assignment'}</p>
              <p className="mt-1 text-sm text-ink/60">{item.patientId?.fullName || 'Patient hidden'}</p>
              <p className="mt-2 text-lg font-medium text-ink">
                Estimated wait: {item.priorityLevel === 'urgent' ? 'Priority' : `${item.estimatedWaitMinutes || 0} min`}
              </p>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  )
}
