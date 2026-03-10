import { useEffect, useState } from 'react'
import SectionCard from '../components/SectionCard'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import ConfirmModal from '../components/ConfirmModal'
import Pagination from '../components/Pagination'
import { apiFetch } from '../lib/api'
import toast from 'react-hot-toast'

const PAGE_SIZE = 10

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([])
  const [doctors, setDoctors] = useState([])
  const [patients, setPatients] = useState([])
  const [departments, setDepartments] = useState([])
  const [pageLoading, setPageLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [cancelTarget, setCancelTarget] = useState(null)

  const [formData, setFormData] = useState({
    patientId: '',
    departmentId: '',
    doctorId: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
  })

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = () => {
    Promise.all([
      apiFetch('/appointments').catch(() => ({ appointments: [] })),
      apiFetch('/doctors').catch(() => ({ doctors: [] })),
      apiFetch('/patients').catch(() => ({ patients: [] })),
      apiFetch('/departments').catch(() => ({ departments: [] })),
    ])
      .then(([aptData, docData, patData, deptData]) => {
        setAppointments(aptData.appointments || [])
        setDoctors(docData.doctors || [])
        setPatients(patData.patients || [])
        setDepartments(deptData.departments || [])
      })
      .finally(() => setPageLoading(false))
  }

  const handleBook = async (e) => {
    e.preventDefault()

    if (!formData.patientId) { toast.error('Select a patient'); return }
    if (!formData.departmentId) { toast.error('Select a department'); return }
    if (!formData.date) { toast.error('Select a date'); return }
    if (!formData.time) { toast.error('Select a time'); return }

    setLoading(true)
    try {
      const slotStart = new Date(`${formData.date}T${formData.time}:00`)
      if (isNaN(slotStart.getTime())) {
        toast.error('Invalid date/time')
        setLoading(false)
        return
      }
      const slotEnd = new Date(slotStart.getTime() + 15 * 60000)
      const selectedDept = departments.find(d => d._id === formData.departmentId)
      const selectedDoc = doctors.find(d => d._id === formData.doctorId)

      await apiFetch('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          patientId: formData.patientId,
          departmentId: formData.departmentId,
          doctorId: formData.doctorId || undefined,
          specialization: selectedDoc?.specialization || selectedDept?.name || 'General',
          bookingType: formData.doctorId ? 'doctor' : 'specialization',
          appointmentDate: new Date(formData.date).toISOString(),
          slotStart: slotStart.toISOString(),
          slotEnd: slotEnd.toISOString(),
          bookingSource: 'receptionist',
          status: 'scheduled',
        }),
      })

      toast.success('Appointment booked successfully')
      setPage(1) // reset pagination to show latest
      fetchData()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!cancelTarget) return
    try {
      await apiFetch(`/appointments/${cancelTarget}/cancel`, { method: 'PATCH' })
      toast.success('Appointment cancelled')
      setPage(1) // reset pagination to show updated list
      fetchData()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCancelTarget(null)
    }
  }

  const totalPages = Math.ceil(appointments.length / PAGE_SIZE)
  const paginated = appointments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <>
      <ConfirmModal
        open={!!cancelTarget}
        title="Cancel Appointment"
        message="This will cancel the appointment and notify the patient. Continue?"
        confirmLabel="Yes, Cancel"
        variant="danger"
        onConfirm={handleCancel}
        onCancel={() => setCancelTarget(null)}
      />

      <div className="space-y-6">
        <h1 className="font-display text-2xl font-semibold">Appointments</h1>

        {pageLoading ? (
          <LoadingSpinner message="Loading appointments..." fullPage />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            {/* Booking Form */}
            <SectionCard title="Book New" eyebrow="Scheduling">
              <form onSubmit={handleBook} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-ink/70">Patient *</label>
                  <select
                    className="mt-1 block w-full rounded-xl border-0 p-2.5 text-sm ring-1 ring-inset ring-ink/10 bg-white"
                    value={formData.patientId}
                    onChange={e => setFormData({ ...formData, patientId: e.target.value })}
                    required
                  >
                    <option value="">Select Patient...</option>
                    {patients.map(p => <option key={p._id} value={p._id}>{p.fullName} ({p.patientCode})</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink/70">Department *</label>
                  <select
                    className="mt-1 block w-full rounded-xl border-0 p-2.5 text-sm ring-1 ring-inset ring-ink/10 bg-white"
                    value={formData.departmentId}
                    onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
                    required
                  >
                    <option value="">Select Department...</option>
                    {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink/70">Preferred Doctor</label>
                  <select
                    className="mt-1 block w-full rounded-xl border-0 p-2.5 text-sm ring-1 ring-inset ring-ink/10 bg-white"
                    value={formData.doctorId}
                    onChange={e => setFormData({ ...formData, doctorId: e.target.value })}
                  >
                    <option value="">Assigned at check-in</option>
                    {doctors.map(d => <option key={d._id} value={d._id}>{d.fullName} — {d.specialization || 'General'}</option>)}
                  </select>
                  <p className="mt-1 text-[10px] text-ink/40">Final doctor assignment is confirmed by the receptionist during check-in.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-ink/70">Date *</label>
                    <input
                      type="date"
                      className="mt-1 block w-full rounded-xl border-0 p-2.5 text-sm ring-1 ring-inset ring-ink/10 bg-white"
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                      required
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink/70">Time *</label>
                    <input
                      type="time"
                      className="mt-1 block w-full rounded-xl border-0 p-2.5 text-sm ring-1 ring-inset ring-ink/10 bg-white"
                      value={formData.time}
                      onChange={e => setFormData({ ...formData, time: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink/90 disabled:opacity-50"
                >
                  {loading ? 'Booking...' : 'Book Appointment'}
                </button>
              </form>
            </SectionCard>

            {/* Appointments List */}
            <SectionCard title="All Appointments" eyebrow={`${appointments.length} total`}>
              <div className="overflow-hidden rounded-2xl border border-ink/10">
                <table className="min-w-full divide-y divide-ink/10 text-left text-sm">
                  <thead className="bg-sand/25 text-ink/60">
                    <tr>
                      <th className="px-4 py-3 font-medium">No.</th>
                      <th className="px-4 py-3 font-medium">Patient</th>
                      <th className="px-4 py-3 font-medium">Doctor</th>
                      <th className="px-4 py-3 font-medium">Date/Time</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/5 bg-white/70">
                    {paginated.length > 0 ? paginated.map((apt) => (
                      <tr key={apt._id} className="hover:bg-canvas/30 transition">
                        <td className="px-4 py-3 font-mono text-xs text-ink/50">{apt.appointmentNumber}</td>
                        <td className="px-4 py-3">{apt.patientId?.fullName || 'N/A'}</td>
                        <td className="px-4 py-3">{apt.doctorId?.fullName ? `Dr. ${apt.doctorId.fullName}` : 'Assigned at check-in'}</td>
                        <td className="px-4 py-3 text-xs">
                          {new Date(apt.slotStart).toLocaleDateString()}{' '}
                          {new Date(apt.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={apt.status} /></td>
                        <td className="px-4 py-3">
                          {apt.status === 'scheduled' && (
                            <button
                              onClick={() => setCancelTarget(apt._id)}
                              className="rounded-full bg-coral/10 px-3 py-1 text-xs font-medium text-coral hover:bg-coral/20"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-ink/50">No appointments found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </SectionCard>
          </div>
        )}
      </div>
    </>
  )
}
