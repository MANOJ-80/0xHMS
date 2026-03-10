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
  const [selectedRx, setSelectedRx] = useState(null)

  const patientId = user?.linkedPatientId

  const fetchData = async () => {
    if (!patientId) return
    try {
      const [aptData, deptData, docData, rxData, notifData] = await Promise.all([
        apiFetch(`/appointments?patientId=${patientId}`),
        apiFetch('/departments'),
        apiFetch('/doctors'),
        apiFetch(`/prescriptions/patient/${patientId}`).catch(() => ({ prescriptions: [] })),
        apiFetch(`/notifications?patientId=${patientId}`).catch(() => ({ notifications: [] })),
      ])
      setAppointments(aptData.appointments || [])
      setDepartments(deptData.departments || [])
      setDoctors(docData.doctors || [])
      setPrescriptions(rxData.prescriptions || [])
      setNotifications((notifData.notifications || []).slice(0, 5))

      // Only set default department on initial load (not on polling refreshes)
      if (deptData.departments?.length > 0) {
        setBookData(prev => prev.departmentId ? prev : { ...prev, departmentId: deptData.departments[0]._id })
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

  if (user?.role !== 'patient' || !patientId) {
    return <div className="p-8 text-center text-ink/60">Patient profile not found.</div>
  }

  const upcomingApts = appointments.filter(a => a.status === 'scheduled')
  const checkedInApts = appointments.filter(a => a.status === 'checked_in')

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

        {/* Active visit status (checked-in appointments) */}
        {checkedInApts.length > 0 && (
          <SectionCard title="Active Visit" eyebrow="Today">
            <div className="space-y-3">
              {checkedInApts.map(apt => (
                <div key={apt._id} className="relative overflow-hidden rounded-2xl bg-teal/5 p-5 ring-1 ring-teal/20">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal/10 text-teal">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">
                        You are checked in{apt.doctorId?.fullName ? ` with Dr. ${apt.doctorId.fullName}` : ''}
                      </h3>
                      <p className="text-xs text-ink/50">
                        Please wait for the doctor to call you for your consultation.
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

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
                        {apt.doctorId ? `Dr. ${apt.doctorId.fullName}` : 'Doctor to be assigned at check-in'}
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
                <label className="block text-xs font-medium text-ink/70">Preferred Doctor (optional)</label>
                <select
                  className="mt-1 block w-full rounded-xl border-0 p-2.5 text-sm ring-1 ring-inset ring-ink/10 bg-white"
                  value={bookData.doctorId}
                  onChange={e => setBookData({ ...bookData, doctorId: e.target.value })}
                >
                  <option value="">No preference</option>
                  {doctors.map(d => (
                    <option key={d._id} value={d._id}>
                      {d.fullName} - {d.specialization}
                    </option>
                  ))}
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
          {/* Prescriptions with detail view */}
          <SectionCard title="My Prescriptions" eyebrow="Medical records">
            {prescriptions.length === 0 ? (
              <p className="py-4 text-center text-sm text-ink/50">No prescriptions yet.</p>
            ) : (
              <div className="space-y-3">
                {prescriptions.slice(0, 5).map(rx => (
                  <button
                    key={rx._id}
                    onClick={() => setSelectedRx(selectedRx?._id === rx._id ? null : rx)}
                    className={`w-full text-left rounded-2xl bg-white/70 p-4 ring-1 transition ${
                      selectedRx?._id === rx._id ? 'ring-teal/40 shadow-sm' : 'ring-ink/10 hover:shadow-sm'
                    }`}
                  >
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

                    {/* Expanded prescription detail */}
                    {selectedRx?._id === rx._id && (
                      <div className="mt-3 border-t border-ink/5 pt-3 space-y-2">
                        {rx.medicines?.map((med, i) => (
                          <div key={i} className="rounded-lg bg-canvas/50 p-2.5">
                            <p className="text-xs font-medium">{med.medicineName}</p>
                            <p className="text-[10px] text-ink/50">
                              {med.dosage} - {med.frequency} - {med.duration}
                              {med.route ? ` (${med.route})` : ''}
                            </p>
                            {med.specialInstructions && (
                              <p className="text-[10px] text-ink/40 italic mt-0.5">{med.specialInstructions}</p>
                            )}
                          </div>
                        ))}
                        {rx.treatmentNotes && (
                          <p className="text-xs text-ink/60 italic">{rx.treatmentNotes}</p>
                        )}
                      </div>
                    )}
                  </button>
                ))}
                {prescriptions.length > 5 && (
                  <p className="text-center text-xs text-ink/40">
                    View all prescriptions in the Prescriptions page
                  </p>
                )}
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
