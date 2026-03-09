import { useEffect, useState } from 'react'
import SectionCard from '../components/SectionCard'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import { apiFetch } from '../lib/api'
import { useQueuePolling } from '../lib/useQueuePolling'
import toast from 'react-hot-toast'

export default function QueueBoardPage() {
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [departmentIds, setDepartmentIds] = useState([])
  const [filter, setFilter] = useState('all')

  const fetchQueue = () => {
    apiFetch('/queue/board')
      .then((data) => setQueue(data.queue))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchQueue()
    apiFetch('/departments')
      .then((data) => {
        if (data.departments) {
          setDepartmentIds(data.departments.map((d) => d._id))
        }
      })
      .catch(() => {})
  }, [])

  useQueuePolling(fetchQueue, { room: 'department', ids: departmentIds })

  const filtered = filter === 'all'
    ? queue
    : queue.filter(item => item.queueStatus === filter)

  const statusCounts = {
    all: queue.length,
    waiting: queue.filter(q => q.queueStatus === 'waiting').length,
    in_consultation: queue.filter(q => q.queueStatus === 'in_consultation').length,
    completed: queue.filter(q => q.queueStatus === 'completed').length,
    missed: queue.filter(q => q.queueStatus === 'missed').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold">Queue Board</h1>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-moss opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-moss" />
          </span>
          <span className="text-xs font-medium text-ink/50">Live</span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(statusCounts).map(([key, count]) => (
          count > 0 || key === 'all' ? (
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
          ) : null
        ))}
      </div>

      <SectionCard title="Active Tokens" eyebrow="Real-time visibility">
        {loading ? (
          <LoadingSpinner message="Loading queue..." />
        ) : filtered.length === 0 ? (
          <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-ink/10 bg-white/30 text-sm text-ink/50">
            {filter === 'all' ? 'No active tokens in the queue.' : `No ${filter.replace(/_/g, ' ')} tokens.`}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {filtered.map((item) => (
              <article
                key={item._id}
                className={`rounded-2xl bg-white/70 p-5 ring-1 transition ${
                  item.queueStatus === 'in_consultation'
                    ? 'ring-coral/30'
                    : item.priorityLevel === 'urgent'
                      ? 'ring-coral/20'
                      : 'ring-ink/10'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-teal">Token</p>
                    <h3 className="mt-1 font-display text-3xl font-semibold">{item.tokenNumber}</h3>
                  </div>
                  <StatusBadge status={item.queueStatus} />
                </div>
                <div className="mt-4 space-y-1">
                  <p className="text-sm text-ink/75">
                    {item.assignedDoctorId?.fullName ? `Dr. ${item.assignedDoctorId.fullName}` : 'Awaiting assignment'}
                  </p>
                  <p className="text-xs text-ink/50">{item.patientId?.fullName || 'Patient'}</p>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  {item.priorityLevel === 'urgent' && <StatusBadge status="urgent" />}
                  <p className="text-sm font-medium text-ink/70">
                    {item.estimatedWaitMinutes > 0 ? `~${item.estimatedWaitMinutes}m wait` : ''}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
