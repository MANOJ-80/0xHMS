import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import SectionCard from '../components/SectionCard'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import { apiFetch } from '../lib/api'
import toast from 'react-hot-toast'

export default function DoctorHistoryPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [doctor, setDoctor] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [consultations, setConsultations] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [stats, setStats] = useState({})
  const [activeTab, setActiveTab] = useState('appointments')

  useEffect(() => {
    apiFetch(`/doctors/${id}/history`)
      .then((data) => {
        setDoctor(data.doctor)
        setAppointments(data.appointments || [])
        setConsultations(data.consultations || [])
        setPrescriptions(data.prescriptions || [])
        setStats(data.stats || {})
      })
      .catch((err) => {
        toast.error(err.message)
        navigate(-1)
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <LoadingSpinner message="Loading doctor history..." fullPage />
  if (!doctor) return <div className="p-8 text-center text-ink/60">Doctor not found.</div>

  const tabs = [
    { key: 'appointments', label: 'Appointments', count: appointments.length },
    { key: 'consultations', label: 'Consultations', count: consultations.length },
    { key: 'prescriptions', label: 'Prescriptions', count: prescriptions.length },
  ]

  return (
    <div className="space-y-6">
      {/* Back button + header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/70 ring-1 ring-ink/10 hover:bg-canvas/70 transition"
        >
          <svg className="h-4 w-4 text-ink/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="font-display text-2xl font-semibold">Dr. {doctor.fullName}</h1>
          <p className="text-sm text-ink/60">
            {doctor.doctorCode}
            {doctor.specialization ? ` · ${doctor.specialization}` : ''}
            {doctor.departmentId?.name ? ` · ${doctor.departmentId.name}` : ''}
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white/70 p-4 ring-1 ring-teal/20">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-teal/70">Total Appointments</p>
          <p className="mt-1 font-display text-2xl font-semibold">{stats.totalAppointments || 0}</p>
        </div>
        <div className="rounded-2xl bg-white/70 p-4 ring-1 ring-coral/20">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-coral/70">Consultations Done</p>
          <p className="mt-1 font-display text-2xl font-semibold">{stats.completedConsultations || 0}</p>
        </div>
        <div className="rounded-2xl bg-white/70 p-4 ring-1 ring-moss/20">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-moss/70">Prescriptions</p>
          <p className="mt-1 font-display text-2xl font-semibold">{stats.totalPrescriptions || 0}</p>
        </div>
        <div className="rounded-2xl bg-white/70 p-4 ring-1 ring-ink/10">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/40">Status</p>
          <p className="mt-1"><StatusBadge status={doctor.availabilityStatus || 'offline'} /></p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl bg-white/60 p-1 ring-1 ring-ink/10">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
              activeTab === tab.key
                ? 'bg-ink text-white shadow-sm'
                : 'text-ink/60 hover:text-ink hover:bg-canvas/50'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
              activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-ink/5 text-ink/40'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'appointments' && (
        <SectionCard title="Appointment History" eyebrow={`${appointments.length} records`}>
          {appointments.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink/50">No appointments found.</p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-ink/10">
              <table className="min-w-full divide-y divide-ink/10 text-left text-sm">
                <thead className="bg-sand/25 text-ink/60">
                  <tr>
                    <th className="px-4 py-3 font-medium">No.</th>
                    <th className="px-4 py-3 font-medium">Patient</th>
                    <th className="px-4 py-3 font-medium">Department</th>
                    <th className="px-4 py-3 font-medium">Date/Time</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/5 bg-white/70">
                  {appointments.map((apt) => (
                    <tr key={apt._id} className="hover:bg-canvas/30 transition">
                      <td className="px-4 py-3 font-mono text-xs text-ink/50">{apt.appointmentNumber}</td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{apt.patientId?.fullName || 'Unknown'}</p>
                          <p className="text-xs text-ink/50">{apt.patientId?.patientCode}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink/70">{apt.departmentId?.name || 'N/A'}</td>
                      <td className="px-4 py-3 text-xs">
                        {new Date(apt.slotStart).toLocaleDateString()}{' '}
                        {new Date(apt.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={apt.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}

      {activeTab === 'consultations' && (
        <SectionCard title="Consultation History" eyebrow={`${consultations.length} records`}>
          {consultations.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink/50">No consultations found.</p>
          ) : (
            <div className="space-y-3">
              {consultations.map((con) => (
                <div key={con._id} className="rounded-2xl bg-white/70 p-4 ring-1 ring-ink/10">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold">
                        {con.patientId?.fullName || 'Patient'}
                        <span className="ml-2 text-xs font-normal text-ink/50">{con.patientId?.patientCode}</span>
                      </p>
                      <p className="text-xs text-ink/50">
                        {con.departmentId?.name || ''} · {new Date(con.startedAt || con.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <StatusBadge status={con.status} />
                  </div>
                  {con.consultationNotes && (
                    <p className="mt-2 text-xs text-ink/60 bg-canvas/50 rounded-lg p-2.5">{con.consultationNotes}</p>
                  )}
                  <p className="mt-2 font-mono text-[10px] text-ink/30">{con.consultationNumber}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {activeTab === 'prescriptions' && (
        <SectionCard title="Prescription History" eyebrow={`${prescriptions.length} records`}>
          {prescriptions.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink/50">No prescriptions found.</p>
          ) : (
            <div className="space-y-4">
              {prescriptions.map((rx) => (
                <div key={rx._id} className="rounded-2xl bg-white/70 p-5 ring-1 ring-ink/10">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold">{rx.diagnosis || 'No diagnosis'}</p>
                      <p className="text-xs text-ink/50">
                        {rx.patientId?.fullName || 'Patient'}
                        <span className="ml-2">{rx.patientId?.patientCode}</span>
                        {' · '}
                        {new Date(rx.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="font-mono text-[10px] text-ink/30">{rx.prescriptionNumber}</span>
                  </div>
                  {rx.treatmentNotes && (
                    <p className="mb-3 text-xs text-ink/60 bg-canvas/50 rounded-lg p-2.5">{rx.treatmentNotes}</p>
                  )}
                  <div className="overflow-hidden rounded-xl border border-ink/5">
                    <table className="min-w-full divide-y divide-ink/5 text-left text-xs">
                      <thead className="bg-sand/20 text-ink/50">
                        <tr>
                          <th className="px-3 py-2 font-medium">Medicine</th>
                          <th className="px-3 py-2 font-medium">Dosage</th>
                          <th className="px-3 py-2 font-medium">Frequency</th>
                          <th className="px-3 py-2 font-medium">Duration</th>
                          <th className="px-3 py-2 font-medium">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink/5 bg-white">
                        {(rx.medicines || []).map((med, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 font-medium">{med.medicineName}</td>
                            <td className="px-3 py-2 text-ink/70">{med.dosage}</td>
                            <td className="px-3 py-2 text-ink/70">{med.frequency}</td>
                            <td className="px-3 py-2 text-ink/70">{med.duration}</td>
                            <td className="px-3 py-2 text-ink/70">{med.reasonForChosen}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}
    </div>
  )
}
