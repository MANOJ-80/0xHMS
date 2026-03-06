import { useEffect, useState } from 'react'
import SectionCard from '../components/SectionCard'
import StatusBadge from '../components/StatusBadge'
import AlertBanner from '../components/AlertBanner'
import LoadingSpinner from '../components/LoadingSpinner'
import { apiFetch } from '../lib/api'

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([])
  const [doctors, setDoctors] = useState([])
  const [patients, setPatients] = useState([])
  const [departments, setDepartments] = useState([])
  const [pageLoading, setPageLoading] = useState(true)

  const [formData, setFormData] = useState({
    patientId: '',
    departmentId: '',
    doctorId: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00'
  })

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
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
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const slotStart = new Date(`${formData.date}T${formData.time}:00`)
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
          status: 'scheduled'
        })
      })

      setSuccess('Appointment booked successfully')
      fetchData()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel appointment?')) return
    try {
      await apiFetch(`/appointments/${id}/cancel`, { method: 'PATCH' })
      fetchData()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <SectionCard title="Appointment desk" eyebrow="Scheduling">
      {pageLoading ? (
        <LoadingSpinner message="Loading appointments..." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
          {/* Booking Form */}
          <div className="rounded-3xl bg-white/70 p-6 ring-1 ring-ink/10">
            <h3 className="font-display text-xl font-semibold mb-4">Book New Appointment</h3>
            <AlertBanner variant="error" message={error} onDismiss={() => setError('')} />
            <AlertBanner variant="success" message={success} onDismiss={() => setSuccess('')} />

            <form onSubmit={handleBook} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink">Patient</label>
                <select className="mt-1 block w-full rounded-xl border-0 p-2.5 text-ink ring-1 ring-inset ring-ink/10 bg-white"
                  value={formData.patientId} onChange={e => setFormData({ ...formData, patientId: e.target.value })} required>
                  <option value="">Select Patient...</option>
                  {patients.map(p => <option key={p._id} value={p._id}>{p.fullName}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink">Department</label>
                <select className="mt-1 block w-full rounded-xl border-0 p-2.5 text-ink ring-1 ring-inset ring-ink/10 bg-white"
                  value={formData.departmentId} onChange={e => setFormData({ ...formData, departmentId: e.target.value })} required>
                  <option value="">Select Department...</option>
                  {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink">Doctor (Optional)</label>
                <select className="mt-1 block w-full rounded-xl border-0 p-2.5 text-ink ring-1 ring-inset ring-ink/10 bg-white"
                  value={formData.doctorId} onChange={e => setFormData({ ...formData, doctorId: e.target.value })}>
                  <option value="">Any Available Doctor</option>
                  {doctors.map(d => <option key={d._id} value={d._id}>{d.fullName}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink">Date</label>
                  <input type="date" className="mt-1 block w-full rounded-xl border-0 p-2.5 text-ink ring-1 ring-inset ring-ink/10 bg-white"
                    value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink">Time</label>
                  <input type="time" className="mt-1 block w-full rounded-xl border-0 p-2.5 text-ink ring-1 ring-inset ring-ink/10 bg-white"
                    value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} required />
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-ink/90 disabled:opacity-50">
                {loading ? 'Booking...' : 'Book Appointment'}
              </button>
            </form>
          </div>

          {/* Appointments List */}
          <div className="overflow-hidden rounded-3xl border border-ink/10">
            <table className="min-w-full divide-y divide-ink/10 text-left text-sm">
              <thead className="bg-sand/35 text-ink/70">
                <tr>
                  <th className="px-4 py-3 font-medium">No.</th>
                  <th className="px-4 py-3 font-medium">Patient</th>
                  <th className="px-4 py-3 font-medium">Doctor</th>
                  <th className="px-4 py-3 font-medium">Date/Time</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10 bg-white/70">
                {appointments.length > 0 ? appointments.map((apt) => (
                  <tr key={apt._id}>
                    <td className="px-4 py-4 font-mono text-xs">{apt.appointmentNumber}</td>
                    <td className="px-4 py-4">{apt.patientId?.fullName || 'N/A'}</td>
                    <td className="px-4 py-4">{apt.doctorId?.fullName || 'N/A'}</td>
                    <td className="px-4 py-4">
                      {new Date(apt.slotStart).toLocaleDateString()} {new Date(apt.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={apt.status} />
                    </td>
                    <td className="px-4 py-4">
                      {apt.status === 'scheduled' && (
                        <button onClick={() => handleCancel(apt._id)} className="text-coral hover:underline text-xs">Cancel</button>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-ink/60">No appointments found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </SectionCard>
  )
}
