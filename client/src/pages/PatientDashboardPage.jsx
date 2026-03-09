import { useEffect, useState } from 'react'
import SectionCard from '../components/SectionCard'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import ConfirmModal from '../components/ConfirmModal'
import { apiFetch } from '../lib/api'
import { useAuth } from '../components/AuthProvider'
import { useQueuePolling } from '../lib/useQueuePolling'
import toast from 'react-hot-toast'

export default function PatientDashboardPage() {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [queueTokens, setQueueTokens] = useState([])
  const [departments, setDepartments] = useState([])
  const [doctors, setDoctors] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [notifications, setNotifications] = useState([])
  const [pageLoading, setPageLoading] = useState(true)

  const [bookData, setBookData] = useState({
    departmentId: '',
    doctorId: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
  })

  const [bookLoading, setBookLoading] = useState(false)
  const [cancelTarget, setCancelTarget] = useState(null)

  const patientId = user?.linkedPatientId

  const fetchData = async () => {
    if (!patientId) return
    try {
      const [aptData, queueData, deptData, docData, rxData, notifData] = await Promise.all([
        apiFetch(`/appointments?patientId=${patientId}`),
        apiFetch(`/queue/tokens?patientId=${patientId}`),
        apiFetch('/departments'),
        apiFetch('/doctors'),
        apiFetch(`/prescriptions/patient/${patientId}`).catch(() => ({ prescriptions: [] })),
        apiFetch(`/notifications?patientId=${patientId}`).catch(() => ({ notifications: [] })),
      ])
      setAppointments(aptData.appointments || [])
      setQueueTokens(queueData.queueTokens || [])
      setDepartments(deptData.departments || [])
      setDoctors(docData.doctors || [])
      setPrescriptions((rxData.prescriptions || []).slice(0, 3))
      setNotifications((notifData.notifications || []).slice(0, 5))

      if (deptData.departments?.length > 0 && !bookData.departmentId) {
        setBookData(prev => ({ ...prev, departmentId: deptData.departments[0]._id }))
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setPageLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [patientId])

  useQueuePolling(fetchData, { room: 'patient', ids: patientId })

  const handleBook = async (e) => {
    e.preventDefault()
    if (!bookData.departmentId) {
      toast.error('Select a department')
      return
    }
    setBookLoading(true)

    try {
      const slotStart = new Date(`${bookData.date}T${bookData.time}:00`)
      const slotEnd = new Date(slotStart.getTime() + 15 * 60000)
      const selectedDept = departments.find(d => d._id === bookData.departmentId)
      const selectedDoc = doctors.find(d => d._id === bookData.doctorId)

      await apiFetch('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          patientId,
          departmentId: bookData.departmentId,
          doctorId: bookData.doctorId || undefined,
          specialization: selectedDoc?.specialization || selectedDept?.name || 'General',
          bookingType: bookData.doctorId ? 'doctor' : 'specialization',
          appointmentDate: new Date(bookData.date).toISOString(),
          slotStart: slotStart.toISOString(),
          slotEnd: slotEnd.toISOString(),
          bookingSource: 'patient_portal',
          status: 'scheduled',
        }),
      })

      toast.success('Appointment booked successfully!')
      fetchData()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBookLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!cancelTarget) return
    try {
      await apiFetch(`/appointments/${cancelTarget}/cancel`, { method: 'PATCH' })
      toast.success('Appointment cancelled')
      fetchData()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCancelTarget(null)
    }
  }

  if (user?.role !== 'patient' && !patientId) {
    return <div className="p-8 text-center text-ink/60">Patient profile not found.</div>
  }

  const activeTokens = queueTokens.filter(q => q.queueStatus !== 'completed' && q.queueStatus !== 'missed')
  const upcomingApts = appointments.filter(a => a.status === 'scheduled')

  if (pageLoading) {
    return <LoadingSpinner message="Loading your dashboard..." fullPage />
  }

  return (
    <>
      <ConfirmModal
        open={!!cancelTarget}
        title="Cancel Appointment"
        message="Are you sure you want to cancel this appointment? This action cannot be undone."
        confirmLabel="Yes, Cancel"
        variant="danger"
        onConfirm={handleCancel}
        onCancel={() => setCancelTarget(null)}
      />

      <div className="space-y-6">
        <h1 className="font-display text-2xl font-semibold">
          Welcome{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}
        </h1>

        {/* Live queue status */}
        <SectionCard title="Live Queue Status" eyebrow="Your visit today">
          {activeTokens.length === 0 ? (
            <div className="rounded-2xl bg-canvas/70 p-6 text-center text-sm text-ink/50 ring-1 ring-ink/5">
              You are not currently checked into any queue.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {activeTokens.map(token => (
                <div key={token._id} className="relative overflow-hidden rounded-2xl bg-white/70 p-5 ring-1 ring-ink/10">
                  {token.priorityLevel === 'urgent' && (
                    <div className="absolute top-0 right-0 rounded-bl-xl bg-coral px-3 py-1 text-[10px] font-bold text-white">
                      URGENT
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 flex-col items-center justify-center rounded-2xl bg-teal/10 text-teal">
                      <span className="text-[10px] font-semibold uppercase tracking-widest opacity-80">Token</span>
                      <span className="font-display text-xl font-bold">{token.tokenNumber.split('-').pop()}</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">
                        {token.assignedDoctorId?.fullName ? `Dr. ${token.assignedDoctorId.fullName}` : 'Assigning doctor...'}
                      </h3>
                      <p className="text-xs text-ink/50">
                        {token.assignedDoctorId?.consultationRoom ? `Room: ${token.assignedDoctorId.consultationRoom}` : 'Please wait'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-canvas/50 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/40">Status</p>
                      <div className="mt-1"><StatusBadge status={token.queueStatus} /></div>
                    </div>
                    <div className="rounded-xl bg-canvas/50 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/40">Est. Wait</p>
                      <p className="mt-1 text-sm font-medium">{token.estimatedWaitMinutes || 0} min</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upcoming appointments */}
          <SectionCard title="Upcoming Appointments" eyebrow="Schedule">
            {upcomingApts.length === 0 ? (
              <p className="py-4 text-center text-sm text-ink/50">No upcoming appointments.</p>
            ) : (
              <div className="space-y-3">
                {upcomingApts.map(apt => (
                  <div key={apt._id} className="flex items-center justify-between rounded-2xl bg-white/70 p-4 ring-1 ring-ink/10">
                    <div>
                      <h4 className="text-sm font-semibold">
                        {apt.doctorId ? `Dr. ${apt.doctorId.fullName}` : 'Any Available Doctor'}
                      </h4>
                      <p className="text-xs text-ink/50">
                        {new Date(apt.slotStart).toLocaleDateString()} at{' '}
                        {new Date(apt.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <button
                      onClick={() => setCancelTarget(apt._id)}
                      className="rounded-full bg-coral/10 px-3 py-1.5 text-xs font-medium text-coral hover:bg-coral/20"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Book appointment */}
          <SectionCard title="Book Appointment" eyebrow="Self-service">
            <form onSubmit={handleBook} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink/70">Department</label>
                <select
                  className="mt-1 block w-full rounded-xl border-0 p-2.5 text-sm ring-1 ring-inset ring-ink/10 bg-white"
                  value={bookData.departmentId}
                  onChange={e => setBookData({ ...bookData, departmentId: e.target.value })}
                  required
                >
                  <option value="">Select Department...</option>
                  {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink/70">Doctor (Optional)</label>
                <select
                  className="mt-1 block w-full rounded-xl border-0 p-2.5 text-sm ring-1 ring-inset ring-ink/10 bg-white"
                  value={bookData.doctorId}
                  onChange={e => setBookData({ ...bookData, doctorId: e.target.value })}
                >
                  <option value="">Any Available</option>
                  {doctors.map(d => <option key={d._id} value={d._id}>{d.fullName}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink/70">Date</label>
                  <input
                    type="date"
                    className="mt-1 block w-full rounded-xl border-0 p-2.5 text-sm ring-1 ring-inset ring-ink/10 bg-white"
                    value={bookData.date}
                    onChange={e => setBookData({ ...bookData, date: e.target.value })}
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink/70">Time</label>
                  <input
                    type="time"
                    className="mt-1 block w-full rounded-xl border-0 p-2.5 text-sm ring-1 ring-inset ring-ink/10 bg-white"
                    value={bookData.time}
                    onChange={e => setBookData({ ...bookData, time: e.target.value })}
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={bookLoading}
                className="w-full rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink/90 disabled:opacity-50"
              >
                {bookLoading ? 'Booking...' : 'Confirm Booking'}
              </button>
            </form>
          </SectionCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent prescriptions */}
          <SectionCard title="Recent Prescriptions" eyebrow="Medical records">
            {prescriptions.length === 0 ? (
              <p className="py-4 text-center text-sm text-ink/50">No prescriptions yet.</p>
            ) : (
              <div className="space-y-3">
                {prescriptions.map(rx => (
                  <div key={rx._id} className="rounded-2xl bg-white/70 p-4 ring-1 ring-ink/10">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-mono text-[10px] text-ink/40">{rx.prescriptionNumber}</p>
                        <p className="text-sm font-medium">{rx.diagnosis || 'No diagnosis'}</p>
                        <p className="text-xs text-ink/50">Dr. {rx.doctorId?.fullName || 'Unknown'}</p>
                      </div>
                      <span className="text-[10px] text-ink/40">{new Date(rx.createdAt).toLocaleDateString()}</span>
                    </div>
                    {rx.medicines?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {rx.medicines.slice(0, 3).map((m, i) => (
                          <span key={i} className="rounded-full bg-teal/10 px-2 py-0.5 text-[10px] font-medium text-teal">
                            {m.medicineName}
                          </span>
                        ))}
                        {rx.medicines.length > 3 && (
                          <span className="text-[10px] text-ink/40">+{rx.medicines.length - 3} more</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Recent notifications */}
          <SectionCard title="Recent Notifications" eyebrow="Updates">
            {notifications.length === 0 ? (
              <p className="py-4 text-center text-sm text-ink/50">No notifications yet.</p>
            ) : (
              <div className="space-y-2">
                {notifications.map(n => (
                  <div key={n._id} className="flex items-center justify-between rounded-xl bg-white/70 p-3 ring-1 ring-ink/5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium capitalize truncate">{(n.type || '').replace(/_/g, ' ')}</p>
                      <p className="text-xs text-ink/40 truncate">{n.message?.slice(0, 60) || 'No details'}</p>
                    </div>
                    <span className={`ml-2 flex-shrink-0 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      n.status === 'sent' ? 'bg-moss/10 text-moss' : n.status === 'failed' ? 'bg-coral/10 text-coral' : 'bg-sand/40 text-ink/70'
                    }`}>
                      {n.channel}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </>
  )
}
