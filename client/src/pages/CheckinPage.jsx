import { useEffect, useState } from 'react'
import SectionCard from '../components/SectionCard'
import LoadingSpinner from '../components/LoadingSpinner'
import { apiFetch } from '../lib/api'
import toast from 'react-hot-toast'

export default function CheckinPage() {
  const [patients, setPatients] = useState([])
  const [departments, setDepartments] = useState([])
  const [doctors, setDoctors] = useState([])
  const [appointments, setAppointments] = useState([])
  const [pageLoading, setPageLoading] = useState(true)

  const [formData, setFormData] = useState({
    patientId: '',
    appointmentId: '',
    departmentId: '',
    doctorId: '',
    isWalkIn: false,
    urgencyLevel: 'normal',
    notes: '',
    reassignmentReason: '',
  })

  // Track the original doctor from the linked appointment (if any)
  const [appointmentDoctorId, setAppointmentDoctorId] = useState('')

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      apiFetch('/patients').catch(() => ({ patients: [] })),
      apiFetch('/departments').catch(() => ({ departments: [] })),
      apiFetch('/doctors').catch(() => ({ doctors: [] })),
      apiFetch('/appointments').catch(() => ({ appointments: [] })),
    ]).then(([patientsData, deptsData, doctorsData, aptData]) => {
      setPatients(patientsData.patients || [])
      setDepartments(deptsData.departments || [])
      setDoctors(doctorsData.doctors || [])
      // Only show scheduled appointments that can be checked in
      setAppointments((aptData.appointments || []).filter(a => a.status === 'scheduled'))

      setFormData(prev => {
        const newData = { ...prev }
        if (deptsData.departments?.length > 0 && !prev.departmentId) {
          newData.departmentId = deptsData.departments[0]._id
        }
        return newData
      })
    }).finally(() => setPageLoading(false))
  }, [])

  // When an appointment is selected, auto-fill patient, department, and doctor
  const handleAppointmentSelect = (appointmentId) => {
    const apt = appointments.find(a => a._id === appointmentId)
    if (apt) {
      const originalDoctor = apt.doctorId?._id || apt.doctorId || ''
      setAppointmentDoctorId(originalDoctor)
      setFormData(prev => ({
        ...prev,
        appointmentId,
        patientId: apt.patientId?._id || apt.patientId || prev.patientId,
        departmentId: apt.departmentId?._id || apt.departmentId || prev.departmentId,
        doctorId: originalDoctor || prev.doctorId,
        isWalkIn: false,
        reassignmentReason: '',
      }))
    } else {
      setAppointmentDoctorId('')
      setFormData(prev => ({ ...prev, appointmentId: '', reassignmentReason: '' }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.patientId) { toast.error('Select a patient'); return }
    if (!formData.departmentId) { toast.error('Select a department'); return }
    if (!formData.doctorId) { toast.error('You must assign a doctor — this is required'); return }

    setLoading(true)
    try {
      const payload = {
        patientId: formData.patientId,
        departmentId: formData.departmentId,
        doctorId: formData.doctorId,
        isWalkIn: formData.isWalkIn,
        urgencyLevel: formData.urgencyLevel,
        notes: formData.notes,
      }

      if (formData.appointmentId) {
        payload.appointmentId = formData.appointmentId
      }

      // Include reassignment reason if the doctor was changed from the appointment's original
      if (isDoctorReassigned && formData.reassignmentReason.trim()) {
        payload.reassignmentReason = formData.reassignmentReason.trim()
      }

      const data = await apiFetch('/checkins', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      const assignedDoctor = doctors.find(d => d._id === formData.doctorId)
      toast.success(
        `Checked in! Token: ${data.queueToken.tokenNumber} — Assigned to Dr. ${assignedDoctor?.fullName || 'doctor'}`,
        { duration: 6000 },
      )

      // Reset form
      setFormData(prev => ({
        ...prev,
        patientId: '',
        appointmentId: '',
        doctorId: '',
        isWalkIn: false,
        urgencyLevel: 'normal',
        notes: '',
        reassignmentReason: '',
      }))
      setAppointmentDoctorId('')

      // Refresh appointments list
      apiFetch('/appointments').then(aptData => {
        setAppointments((aptData.appointments || []).filter(a => a.status === 'scheduled'))
      }).catch(() => {})
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Detect if the receptionist has changed the doctor from the appointment's original
  const isDoctorReassigned = Boolean(
    formData.appointmentId && appointmentDoctorId && formData.doctorId &&
    formData.doctorId !== appointmentDoctorId
  )

  const appointmentOriginalDoctor = isDoctorReassigned
    ? doctors.find(d => d._id === appointmentDoctorId)
    : null

  // Filter doctors by department if one is selected
  const filteredDoctors = formData.departmentId
    ? doctors.filter(d =>
        (d.departmentId?._id || d.departmentId) === formData.departmentId &&
        d.isActive !== false
      )
    : doctors.filter(d => d.isActive !== false)

  // If no department match, show all active doctors
  const displayDoctors = filteredDoctors.length > 0 ? filteredDoctors : doctors.filter(d => d.isActive !== false)

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Patient Check-in</h1>
      <p className="text-sm text-ink/60">
        Confirm patient arrival and assign to a specific doctor. Doctor assignment is mandatory.
      </p>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Check-in Form */}
        <SectionCard title="Confirm Arrival & Assign Doctor" eyebrow="Front desk">
          {pageLoading ? (
            <LoadingSpinner message="Loading check-in form..." />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Appointment selection (optional) */}
              <div>
                <label className="block text-xs font-medium text-ink/70">Link to Appointment (optional)</label>
                <select
                  className="mt-1.5 block w-full rounded-xl border-0 p-3 text-sm ring-1 ring-inset ring-ink/10 bg-white"
                  value={formData.appointmentId}
                  onChange={e => handleAppointmentSelect(e.target.value)}
                >
                  <option value="">Walk-in / No appointment</option>
                  {appointments.map(apt => (
                    <option key={apt._id} value={apt._id}>
                      {apt.appointmentNumber} - {apt.patientId?.fullName || 'Unknown'} ({new Date(apt.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-ink/70">Patient *</label>
                  <select
                    className="mt-1.5 block w-full rounded-xl border-0 p-3 text-sm ring-1 ring-inset ring-ink/10 bg-white"
                    value={formData.patientId}
                    onChange={e => setFormData({ ...formData, patientId: e.target.value })}
                    required
                  >
                    <option value="">Select a patient</option>
                    {patients.map(p => (
                      <option key={p._id} value={p._id}>{p.fullName} ({p.patientCode})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink/70">Department *</label>
                  <select
                    className="mt-1.5 block w-full rounded-xl border-0 p-3 text-sm ring-1 ring-inset ring-ink/10 bg-white"
                    value={formData.departmentId}
                    onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
                    required
                  >
                    <option value="">Select a department</option>
                    {departments.map(d => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Doctor assignment - MANDATORY */}
              <div>
                <label className="block text-xs font-medium text-ink/70">
                  Assign to Doctor * <span className="text-coral">(required)</span>
                </label>
                <select
                  className="mt-1.5 block w-full rounded-xl border-0 p-3 text-sm ring-1 ring-inset ring-ink/10 bg-white"
                  value={formData.doctorId}
                  onChange={e => setFormData({ ...formData, doctorId: e.target.value })}
                  required
                >
                  <option value="">Select a doctor...</option>
                  {displayDoctors.map(d => (
                    <option key={d._id} value={d._id}>
                      Dr. {d.fullName} - {d.specialization}
                      {d.availabilityStatus ? ` (${d.availabilityStatus})` : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-ink/40">
                  Only the assigned doctor will be able to see and manage this patient.
                </p>

                {isDoctorReassigned && (
                  <div className="mt-3 rounded-lg border border-coral/30 bg-coral/5 p-3">
                    <p className="text-xs font-semibold text-coral">
                      Doctor reassignment detected
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink/60">
                      Originally booked with Dr. {appointmentOriginalDoctor?.fullName || 'Unknown'}. The patient will be
                      notified about this change via SMS.
                    </p>
                    <label className="mt-2 block text-xs font-medium text-ink/70">
                      Reason for reassignment
                    </label>
                    <textarea
                      rows={2}
                      className="mt-1 block w-full rounded-lg border-0 p-2.5 text-sm ring-1 ring-inset ring-coral/20 bg-white"
                      value={formData.reassignmentReason}
                      onChange={e => setFormData({ ...formData, reassignmentReason: e.target.value })}
                      placeholder="e.g. Doctor on leave, schedule conflict, specialist referral..."
                    />
                  </div>
                )}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-ink/70">Urgency Level</label>
                  <select
                    className="mt-1.5 block w-full rounded-xl border-0 p-3 text-sm ring-1 ring-inset ring-ink/10 bg-white"
                    value={formData.urgencyLevel}
                    onChange={e => setFormData({ ...formData, urgencyLevel: e.target.value })}
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-ink/20 text-ink focus:ring-ink"
                      checked={formData.isWalkIn}
                      onChange={e => setFormData({ ...formData, isWalkIn: e.target.checked })}
                    />
                    <span className="text-sm font-medium text-ink">Walk-in patient</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink/70">Notes</label>
                <textarea
                  rows={2}
                  className="mt-1.5 block w-full rounded-xl border-0 p-3 text-sm ring-1 ring-inset ring-ink/10 bg-white"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Symptoms or special requirements..."
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-ink px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-ink/90 disabled:opacity-50"
                >
                  {loading ? 'Checking in...' : 'Confirm & Assign to Doctor'}
                </button>
              </div>
            </form>
          )}
        </SectionCard>

        {/* Doctor availability overview */}
        <SectionCard title="Doctor Availability" eyebrow="Current status">
          {pageLoading ? (
            <LoadingSpinner message="Loading doctors..." />
          ) : doctors.length === 0 ? (
            <p className="py-4 text-center text-sm text-ink/50">No doctors registered.</p>
          ) : (
            <div className="space-y-2">
              {doctors.filter(d => d.isActive !== false).map(d => (
                <div key={d._id} className="flex items-center justify-between rounded-xl bg-white/70 p-3 ring-1 ring-ink/5">
                  <div>
                    <p className="text-sm font-medium">Dr. {d.fullName}</p>
                    <p className="text-xs text-ink/50">{d.specialization}</p>
                  </div>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                    d.availabilityStatus === 'available' ? 'bg-moss/10 text-moss'
                    : d.availabilityStatus === 'busy' ? 'bg-coral/10 text-coral'
                    : d.availabilityStatus === 'on_break' ? 'bg-sand/40 text-ink/70'
                    : 'bg-ink/10 text-ink/50'
                  }`}>
                    {(d.availabilityStatus || 'unknown').replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
