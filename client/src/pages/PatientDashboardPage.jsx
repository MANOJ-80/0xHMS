import { useEffect, useState } from 'react'
import SectionCard from '../components/SectionCard'
import StatusBadge from '../components/StatusBadge'
import AlertBanner from '../components/AlertBanner'
import LoadingSpinner from '../components/LoadingSpinner'
import { apiFetch } from '../lib/api'
import { useAuth } from '../components/AuthProvider'
import { useQueuePolling } from '../lib/useQueuePolling'

export default function PatientDashboardPage() {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [queueTokens, setQueueTokens] = useState([])
  const [departments, setDepartments] = useState([])
  const [doctors, setDoctors] = useState([])
  const [pageLoading, setPageLoading] = useState(true)

  const [bookData, setBookData] = useState({
    departmentId: '',
    doctorId: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00'
  })

  const [bookLoading, setBookLoading] = useState(false)
  const [error, setError] = useState('')
  const [bookSuccess, setBookSuccess] = useState('')

  const patientId = user?.linkedPatientId

  const fetchData = async () => {
    if (!patientId) return
    try {
      const [aptData, queueData, deptData, docData] = await Promise.all([
        apiFetch(`/appointments?patientId=${patientId}`),
        apiFetch(`/queue/tokens?patientId=${patientId}`),
        apiFetch('/departments'),
        apiFetch('/doctors')
      ])
      setAppointments(aptData.appointments || [])
      setQueueTokens(queueData.queueTokens || [])
      setDepartments(deptData.departments || [])
      setDoctors(docData.doctors || [])

      if (deptData.departments?.length > 0 && !bookData.departmentId) {
        setBookData(prev => ({ ...prev, departmentId: deptData.departments[0]._id }))
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setPageLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [patientId])

  // Real-time: Socket.IO in dev, polling fallback on Vercel
  useQueuePolling(fetchData, { room: 'patient', ids: patientId })

  const handleBook = async (e) => {
    e.preventDefault()
    setBookLoading(true)
    setError('')
    setBookSuccess('')

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
          status: 'scheduled'
        })
      })

      setBookSuccess('Appointment booked successfully!')
      fetchData()
    } catch (err) {
      setError(err.message)
    } finally {
      setBookLoading(false)
    }
  }

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return
    try {
      await apiFetch(`/appointments/${id}/cancel`, { method: 'PATCH' })
      fetchData()
    } catch (err) {
      setError(err.message)
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
    <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
      <div className="space-y-6">
        <SectionCard title="Live Queue Status" eyebrow="Your Visit Today">
          <AlertBanner variant="error" message={error} onDismiss={() => setError('')} />

          {activeTokens.length === 0 ? (
            <div className="rounded-3xl bg-canvas/70 p-6 text-center text-ink/60 ring-1 ring-ink/5">
              You are not currently checked into any queue.
            </div>
          ) : (
            <div className="space-y-4">
              {activeTokens.map(token => (
                <div key={token._id} className="rounded-3xl bg-white/70 p-6 ring-1 ring-ink/10 relative overflow-hidden">
                  {token.priorityLevel === 'urgent' && (
                    <div className="absolute top-0 right-0 bg-coral text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
                      URGENT
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 flex-col items-center justify-center rounded-2xl bg-teal/10 text-teal">
                      <span className="text-xs font-semibold uppercase tracking-widest opacity-80">Token</span>
                      <span className="font-display text-xl font-bold">{token.tokenNumber.split('-').pop()}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-ink">
                        {token.assignedDoctorId?.fullName ? `Dr. ${token.assignedDoctorId.fullName}` : 'Assigning Doctor...'}
                      </h3>
                      <p className="text-sm text-ink/60">
                        {token.assignedDoctorId?.consultationRoom ? `Room: ${token.assignedDoctorId.consultationRoom}` : 'Please wait in lobby'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-canvas/50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">Status</p>
                      <div className="mt-1">
                        <StatusBadge status={token.queueStatus} />
                      </div>
                    </div>
                    <div className="rounded-2xl bg-canvas/50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">Est. Wait</p>
                      <p className="mt-1 font-medium text-ink">{token.estimatedWaitMinutes || 0} mins</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Upcoming Appointments" eyebrow="Schedule">
          <div className="space-y-4">
            {upcomingApts.length === 0 ? (
              <p className="py-4 text-center text-ink/60">No upcoming appointments.</p>
            ) : upcomingApts.map(apt => (
              <div key={apt._id} className="flex items-center justify-between rounded-3xl bg-white/70 p-5 ring-1 ring-ink/10">
                <div>
                  <h4 className="font-semibold text-ink">
                    {apt.doctorId ? `Dr. ${apt.doctorId.fullName}` : 'Any Available Doctor'}
                  </h4>
                  <p className="text-sm text-ink/60">
                    {new Date(apt.slotStart).toLocaleDateString()} at {new Date(apt.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button
                  onClick={() => handleCancel(apt._id)}
                  className="rounded-full bg-coral/10 px-4 py-2 text-sm font-medium text-coral hover:bg-coral/20"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Book Appointment" eyebrow="Self-service">
        <form onSubmit={handleBook} className="rounded-3xl bg-white/70 p-6 ring-1 ring-ink/10">
          <AlertBanner variant="error" message={error} onDismiss={() => setError('')} />
          <AlertBanner variant="success" message={bookSuccess} onDismiss={() => setBookSuccess('')} />

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink">Department</label>
              <select className="mt-1 block w-full rounded-xl border-0 p-3 text-ink ring-1 ring-inset ring-ink/10 bg-white"
                value={bookData.departmentId} onChange={e => setBookData({ ...bookData, departmentId: e.target.value })} required>
                <option value="">Select Department...</option>
                {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink">Doctor (Optional)</label>
              <select className="mt-1 block w-full rounded-xl border-0 p-3 text-ink ring-1 ring-inset ring-ink/10 bg-white"
                value={bookData.doctorId} onChange={e => setBookData({ ...bookData, doctorId: e.target.value })}>
                <option value="">Any Available Doctor</option>
                {doctors.map(d => <option key={d._id} value={d._id}>{d.fullName}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink">Date</label>
                <input type="date" className="mt-1 block w-full rounded-xl border-0 p-3 text-ink ring-1 ring-inset ring-ink/10 bg-white"
                  value={bookData.date} onChange={e => setBookData({ ...bookData, date: e.target.value })} required
                  min={new Date().toISOString().split('T')[0]} />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink">Time</label>
                <input type="time" className="mt-1 block w-full rounded-xl border-0 p-3 text-ink ring-1 ring-inset ring-ink/10 bg-white"
                  value={bookData.time} onChange={e => setBookData({ ...bookData, time: e.target.value })} required />
              </div>
            </div>

            <button type="submit" disabled={bookLoading} className="mt-6 w-full rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-ink/90 disabled:opacity-50">
              {bookLoading ? 'Booking...' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </SectionCard>
    </div>
  )
}
