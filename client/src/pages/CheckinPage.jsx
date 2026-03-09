import { useEffect, useState } from 'react'
import SectionCard from '../components/SectionCard'
import LoadingSpinner from '../components/LoadingSpinner'
import { apiFetch } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function CheckinPage() {
  const [patients, setPatients] = useState([])
  const [departments, setDepartments] = useState([])
  const [doctors, setDoctors] = useState([])
  const [pageLoading, setPageLoading] = useState(true)

  const [formData, setFormData] = useState({
    patientId: '',
    departmentId: '',
    doctorId: '',
    specialization: 'General Medicine',
    isWalkIn: true,
    urgencyLevel: 'normal',
    notes: '',
  })

  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      apiFetch('/patients').catch(() => ({ patients: [] })),
      apiFetch('/departments').catch(() => ({ departments: [] })),
      apiFetch('/doctors').catch(() => ({ doctors: [] })),
    ]).then(([patientsData, deptsData, doctorsData]) => {
      setPatients(patientsData.patients || [])
      setDepartments(deptsData.departments || [])
      setDoctors(doctorsData.doctors || [])

      setFormData(prev => {
        const newData = { ...prev }
        if (deptsData.departments?.length > 0 && !prev.departmentId) {
          newData.departmentId = deptsData.departments[0]._id
        }
        if (patientsData.patients?.length > 0 && !prev.patientId) {
          newData.patientId = patientsData.patients[0]._id
        }
        const specs = Array.from(new Set((doctorsData.doctors || []).map(d => d.specialization).filter(Boolean)))
        if (specs.length > 0) {
          newData.specialization = specs[0]
        }
        return newData
      })
    }).finally(() => setPageLoading(false))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.patientId) { toast.error('Select a patient'); return }
    if (!formData.departmentId) { toast.error('Select a department'); return }

    setLoading(true)
    try {
      const payload = { ...formData }
      if (!payload.doctorId) delete payload.doctorId

      const data = await apiFetch('/checkins', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      toast.success(`Checked in! Token: ${data.queueToken.tokenNumber}`)
      setTimeout(() => navigate('/queue-board'), 1500)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const specializations = Array.from(new Set(doctors.map(d => d.specialization).filter(Boolean)))

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Patient Check-in</h1>

      <SectionCard title="Front Desk Check-in" eyebrow="Walk-ins & appointments">
        {pageLoading ? (
          <LoadingSpinner message="Loading check-in form..." />
        ) : (
          <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
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

              <div>
                <label className="block text-xs font-medium text-ink/70">Specialization</label>
                <select
                  className="mt-1.5 block w-full rounded-xl border-0 p-3 text-sm ring-1 ring-inset ring-ink/10 bg-white"
                  value={formData.specialization}
                  onChange={e => setFormData({ ...formData, specialization: e.target.value })}
                >
                  <option value="">Any</option>
                  {specializations.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink/70">Preferred Doctor</label>
                <select
                  className="mt-1.5 block w-full rounded-xl border-0 p-3 text-sm ring-1 ring-inset ring-ink/10 bg-white"
                  value={formData.doctorId}
                  onChange={e => setFormData({ ...formData, doctorId: e.target.value })}
                >
                  <option value="">Auto-assign best available</option>
                  {doctors.filter(d => !formData.specialization || d.specialization === formData.specialization).map(d => (
                    <option key={d._id} value={d._id}>Dr. {d.fullName}</option>
                  ))}
                </select>
              </div>
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
                {loading ? 'Checking in...' : 'Check In Patient'}
              </button>
            </div>
          </form>
        )}
      </SectionCard>
    </div>
  )
}
