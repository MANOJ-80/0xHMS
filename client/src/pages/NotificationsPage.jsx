import { useEffect, useState } from 'react'
import SectionCard from '../components/SectionCard'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import Pagination from '../components/Pagination'
import { apiFetch } from '../lib/api'
import { useAuth } from '../components/AuthProvider'
import toast from 'react-hot-toast'

const TYPE_LABELS = {
  appointment_confirmation: 'Appointment Confirmed',
  appointment_reminder: 'Appointment Reminder',
  appointment_cancellation: 'Appointment Cancelled',
  queue_next: 'Your Turn',
  doctor_assignment: 'Doctor Assigned',
  missed_turn: 'Missed Turn',
  prescription_ready: 'Prescription Ready',
  general: 'General',
}

const CHANNEL_STYLE = {
  sms: 'bg-teal/10 text-teal',
  whatsapp: 'bg-moss/10 text-moss',
  in_app: 'bg-ink/10 text-ink/60',
}

const STATUS_STYLE = {
  sent: 'bg-moss/10 text-moss',
  pending: 'bg-sand/40 text-ink/80',
  failed: 'bg-coral/10 text-coral',
  scheduled: 'bg-teal/10 text-teal',
}

const PAGE_SIZE = 10

export default function NotificationsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)

  const isAdmin = user?.role === 'admin'
  const isStaff = user?.role === 'admin' || user?.role === 'receptionist'

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      let url = '/notifications'
      if (user?.role === 'patient' && user?.linkedPatientId) {
        url += `?patientId=${user.linkedPatientId}`
      }
      const data = await apiFetch(url)
      setNotifications(data.notifications || [])
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = async (id) => {
    try {
      await apiFetch(`/notifications/${id}/retry`, { method: 'PATCH' })
      toast.success('Notification retried')
      fetchNotifications()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const filtered = filter === 'all'
    ? notifications
    : notifications.filter(n => n.type === filter)

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const uniqueTypes = [...new Set(notifications.map(n => n.type))]

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
      <SectionCard title="Notifications" eyebrow="Communication log">
        {loading ? (
          <LoadingSpinner message="Loading notifications..." />
        ) : (
          <>
            {/* Filter bar */}
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                onClick={() => { setFilter('all'); setPage(1); setSelected(null) }}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  filter === 'all' ? 'bg-ink text-white' : 'bg-white text-ink/70 ring-1 ring-ink/10 hover:text-ink'
                }`}
              >
                All ({notifications.length})
              </button>
              {uniqueTypes.map(type => (
                <button
                  key={type}
                  onClick={() => { setFilter(type); setPage(1); setSelected(null) }}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    filter === type ? 'bg-ink text-white' : 'bg-white text-ink/70 ring-1 ring-ink/10 hover:text-ink'
                  }`}
                >
                  {TYPE_LABELS[type] || type} ({notifications.filter(n => n.type === type).length})
                </button>
              ))}
            </div>

            {/* Notification list */}
            {paginated.length === 0 ? (
              <p className="py-8 text-center text-ink/60">No notifications found.</p>
            ) : (
              <div className="space-y-3">
                {paginated.map(notif => (
                  <button
                    key={notif._id}
                    onClick={() => setSelected(notif)}
                    className={`w-full rounded-2xl bg-white/70 p-4 text-left ring-1 transition hover:shadow-sm ${
                      selected?._id === notif._id ? 'ring-teal/40 shadow-sm' : 'ring-ink/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_STYLE[notif.status] || STATUS_STYLE.pending}`}>
                            {notif.status}
                          </span>
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${CHANNEL_STYLE[notif.channel] || CHANNEL_STYLE.sms}`}>
                            {notif.channel}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm font-medium text-ink truncate">
                          {TYPE_LABELS[notif.type] || notif.type}
                        </p>
                        <p className="mt-0.5 text-xs text-ink/50">
                          {notif.patientId?.fullName || 'Unknown patient'} &middot; {new Date(notif.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </SectionCard>

      {/* Detail panel */}
      <SectionCard title="Details" eyebrow="Selected notification">
        {selected ? (
          <div className="space-y-4 rounded-2xl bg-white/70 p-5 ring-1 ring-ink/10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">Type</p>
              <p className="mt-1 text-sm font-medium">{TYPE_LABELS[selected.type] || selected.type}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">Patient</p>
              <p className="mt-1 text-sm">{selected.patientId?.fullName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">Channel</p>
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${CHANNEL_STYLE[selected.channel] || ''}`}>
                {selected.channel}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">Status</p>
              <StatusBadge status={selected.status === 'sent' ? 'completed' : selected.status === 'failed' ? 'cancelled' : 'scheduled'} label={selected.status} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">Message</p>
              <p className="mt-1 rounded-xl bg-canvas/50 p-3 text-sm leading-6 text-ink/80">
                {selected.message || 'No message content'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">Created</p>
                <p className="mt-1 text-sm">{new Date(selected.createdAt).toLocaleString()}</p>
              </div>
              {selected.deliveredAt && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">Delivered</p>
                  <p className="mt-1 text-sm">{new Date(selected.deliveredAt).toLocaleString()}</p>
                </div>
              )}
            </div>
            {selected.retryCount > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">Retries</p>
                <p className="mt-1 text-sm">{selected.retryCount} / {selected.maxRetries || 3}</p>
              </div>
            )}
            {isAdmin && selected.status === 'failed' && (
              <button
                onClick={() => handleRetry(selected._id)}
                className="w-full rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal/90"
              >
                Retry Notification
              </button>
            )}
          </div>
        ) : (
          <div className="flex h-full min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-ink/10 bg-white/30 text-sm text-ink/50">
            Select a notification to view details
          </div>
        )}
      </SectionCard>
    </div>
  )
}
