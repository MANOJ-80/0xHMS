import { useEffect, useState } from 'react'
import SectionCard from '../components/SectionCard'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import { apiFetch } from '../lib/api'
import { useAuth } from '../components/AuthProvider'
import { useQueuePolling } from '../lib/useQueuePolling'
import toast from 'react-hot-toast'

const AVAILABILITY_OPTIONS = ['available', 'busy', 'on_break', 'offline']

const emptyMedicine = { medicineName: '', dosage: '', frequency: '', duration: '', route: 'oral', specialInstructions: '' }

export default function DoctorDashboardPage() {
  const { user } = useAuth()
  const [assignedPatients, setAssignedPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeConsultation, setActiveConsultation] = useState(null)
  const [consultationNotes, setConsultationNotes] = useState('')
  const [availability, setAvailability] = useState('available')

  // Prescription form state
  const [showRxForm, setShowRxForm] = useState(false)
  const [rxData, setRxData] = useState({ diagnosis: '', treatmentNotes: '', medicines: [{ ...emptyMedicine }] })
  const [rxLoading, setRxLoading] = useState(false)

  // Patient history expansion
  const [expandedPatient, setExpandedPatient] = useState(null)
  const [patientHistory, setPatientHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const doctorId = user?.linkedDoctorId

  const fetchAssignedPatients = async () => {
    if (!doctorId) return
    try {
      const data = await apiFetch(`/doctors/${doctorId}/queue`)
      setAssignedPatients(data.queue || [])

      const inConsultation = (data.queue || []).find(q => q.queueStatus === 'in_consultation')
      if (inConsultation && !activeConsultation) {
        apiFetch(`/consultations?doctorId=${doctorId}&status=in_consultation`)
          .then(res => {
            if (res.consultations?.length > 0) {
              setActiveConsultation(res.consultations[0])
            }
          }).catch(() => {})
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAssignedPatients()
    // Fetch current availability
    if (doctorId) {
      apiFetch(`/doctors/${doctorId}`)
        .then(data => {
          if (data.doctor?.availabilityStatus) setAvailability(data.doctor.availabilityStatus)
        })
        .catch(() => {})
    }
  }, [doctorId])

  useQueuePolling(fetchAssignedPatients, { room: 'doctor', ids: doctorId })

  const toggleAvailability = async (newStatus) => {
    try {
      await apiFetch(`/doctors/${doctorId}/availability`, {
        method: 'PATCH',
        body: JSON.stringify({ availabilityStatus: newStatus }),
      })
      setAvailability(newStatus)
      toast.success(`Status changed to ${newStatus.replace(/_/g, ' ')}`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const viewPatientHistory = async (patientId) => {
    if (expandedPatient === patientId) {
      setExpandedPatient(null)
      return
    }
    setHistoryLoading(true)
    setExpandedPatient(patientId)
    setPatientHistory([]) // clear stale data from previous patient
    try {
      const data = await apiFetch(`/prescriptions/patient/${patientId}`)
      setPatientHistory(data.prescriptions || [])
    } catch {
      setPatientHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  const startConsultation = async (tokenId) => {
    try {
      const data = await apiFetch('/consultations/start', {
        method: 'POST',
        body: JSON.stringify({ queueTokenId: tokenId }),
      })
      setActiveConsultation(data.consultation)
      setShowRxForm(false)
      setRxData({ diagnosis: '', treatmentNotes: '', medicines: [{ ...emptyMedicine }] })
      fetchAssignedPatients()
      toast.success('Consultation started')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const finishConsultation = async () => {
    if (!activeConsultation) return
    try {
      await apiFetch(`/consultations/${activeConsultation._id}/complete`, {
        method: 'PATCH',
        body: JSON.stringify({ consultationNotes }),
      })
      toast.success('Consultation completed')
      setShowRxForm(true) // prompt to write prescription
      fetchAssignedPatients() // refresh queue to reflect status change
    } catch (err) {
      toast.error(err.message)
    }
  }

  const addMedicine = () => {
    setRxData(prev => ({ ...prev, medicines: [...prev.medicines, { ...emptyMedicine }] }))
  }

  const removeMedicine = (idx) => {
    setRxData(prev => ({
      ...prev,
      medicines: prev.medicines.filter((_, i) => i !== idx),
    }))
  }

  const updateMedicine = (idx, field, value) => {
    setRxData(prev => ({
      ...prev,
      medicines: prev.medicines.map((m, i) => (i === idx ? { ...m, [field]: value } : m)),
    }))
  }

  const submitPrescription = async (e) => {
    e.preventDefault()
    if (!activeConsultation) return

    // Basic validation
    if (!rxData.diagnosis.trim()) {
      toast.error('Diagnosis is required')
      return
    }
    const validMeds = rxData.medicines.filter(m => m.medicineName.trim())
    if (validMeds.length === 0) {
      toast.error('Add at least one medicine')
      return
    }
    for (const med of validMeds) {
      if (!med.dosage.trim() || !med.frequency.trim() || !med.duration.trim()) {
        toast.error(`Complete all fields for ${med.medicineName}`)
        return
      }
    }

    setRxLoading(true)
    try {
      await apiFetch('/prescriptions', {
        method: 'POST',
        body: JSON.stringify({
          consultationId: activeConsultation._id,
          patientId: activeConsultation.patientId?._id || activeConsultation.patientId,
          doctorId,
          diagnosis: rxData.diagnosis,
          treatmentNotes: rxData.treatmentNotes,
          medicines: validMeds,
        }),
      })
      toast.success('Prescription saved and patient notified')
      setShowRxForm(false)
      setActiveConsultation(null)
      setConsultationNotes('')
      setRxData({ diagnosis: '', treatmentNotes: '', medicines: [{ ...emptyMedicine }] })
      fetchAssignedPatients()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setRxLoading(false)
    }
  }

  const skipPrescription = () => {
    setShowRxForm(false)
    setActiveConsultation(null)
    setConsultationNotes('')
    setRxData({ diagnosis: '', treatmentNotes: '', medicines: [{ ...emptyMedicine }] })
    fetchAssignedPatients()
    toast('Prescription skipped', { icon: '\u2139\uFE0F' })
  }

  if (user?.role !== 'doctor' && user?.role !== 'admin') {
    return <div className="p-8 text-center text-ink/60">Doctor access required.</div>
  }

  if (!doctorId) {
    return <div className="p-8 text-center text-ink/60">No doctor profile linked to this user.</div>
  }

  const activePatients = assignedPatients.filter(q => q.queueStatus !== 'completed' && q.queueStatus !== 'missed')

  return (
    <div className="space-y-6">
      {/* Top bar: availability toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white/70 p-4 ring-1 ring-ink/10">
        <div>
          <h1 className="font-display text-xl font-semibold">My Patients</h1>
          <p className="text-sm text-ink/60">Patients assigned to you by the front desk</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-ink/50 mr-1">Status:</span>
          {AVAILABILITY_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => toggleAvailability(opt)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition ${
                availability === opt
                  ? opt === 'available' ? 'bg-moss text-white' : opt === 'busy' ? 'bg-coral text-white' : opt === 'on_break' ? 'bg-sand text-ink' : 'bg-ink/60 text-white'
                  : 'bg-white text-ink/60 ring-1 ring-ink/10 hover:ring-ink/20'
              }`}
            >
              {opt.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Assigned patients panel */}
        <SectionCard title="Assigned Patients" eyebrow={`${activePatients.length} patient${activePatients.length !== 1 ? 's' : ''}`}>
          {loading ? (
            <LoadingSpinner message="Loading assigned patients..." />
          ) : activePatients.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-ink/10 bg-white/30 text-sm text-ink/50">
              No patients currently assigned to you
            </div>
          ) : (
            <div className="space-y-3">
              {activePatients.map((item) => (
                <div key={item._id} className="rounded-2xl bg-white/70 ring-1 ring-ink/10 overflow-hidden">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-teal/10 font-display text-lg font-bold text-teal">
                        {item.tokenNumber.split('-').pop()}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold">{item.patientId?.fullName || 'Unknown'}</h4>
                        <p className="text-xs text-ink/50">
                          {item.patientId?.patientCode} {item.appointmentId?.slotStart ? `- ${new Date(item.appointmentId.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={item.priorityLevel} />
                      {item.queueStatus === 'in_consultation' ? (
                        <StatusBadge status="in_consultation" label="In Session" />
                      ) : !activeConsultation && !showRxForm ? (
                        <button
                          onClick={() => startConsultation(item._id)}
                          className="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white hover:bg-ink/90"
                        >
                          Start Consultation
                        </button>
                      ) : (
                        <StatusBadge status={item.queueStatus} />
                      )}
                    </div>
                  </div>

                  {/* Patient history toggle */}
                  <div className="border-t border-ink/5 px-4 py-2">
                    <button
                      onClick={() => viewPatientHistory(item.patientId?._id)}
                      className="text-xs font-medium text-teal hover:underline"
                    >
                      {expandedPatient === item.patientId?._id ? 'Hide History' : 'View Medical History'}
                    </button>
                    {expandedPatient === item.patientId?._id && (
                      <div className="mt-2 space-y-2">
                        {historyLoading ? (
                          <p className="text-xs text-ink/40">Loading...</p>
                        ) : patientHistory.length === 0 ? (
                          <p className="text-xs text-ink/40">No previous prescriptions found.</p>
                        ) : (
                          patientHistory.slice(0, 5).map(rx => (
                            <div key={rx._id} className="rounded-lg bg-canvas/50 p-2.5">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-xs font-medium">{rx.diagnosis || 'No diagnosis'}</p>
                                  <p className="text-[10px] text-ink/40">
                                    {rx.medicines?.length || 0} medicine{(rx.medicines?.length || 0) !== 1 ? 's' : ''} - {new Date(rx.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <span className="font-mono text-[10px] text-ink/30">{rx.prescriptionNumber}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Right panel: consultation or prescription */}
        <div className="space-y-6">
          {showRxForm ? (
            /* ── Prescription Form (Manual) ── */
            <SectionCard title="Write Prescription" eyebrow="Post-consultation">
              <form onSubmit={submitPrescription} className="space-y-4 rounded-2xl bg-white/70 p-5 ring-1 ring-ink/10">
                <div>
                  <label className="block text-sm font-medium text-ink">Diagnosis *</label>
                  <input
                    type="text"
                    required
                    className="mt-1.5 block w-full rounded-xl border-0 p-3 text-sm ring-1 ring-inset ring-ink/10 focus:ring-2 focus:ring-ink bg-white"
                    value={rxData.diagnosis}
                    onChange={e => setRxData({ ...rxData, diagnosis: e.target.value })}
                    placeholder="Primary diagnosis..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink">Treatment Notes</label>
                  <textarea
                    rows={2}
                    className="mt-1.5 block w-full rounded-xl border-0 p-3 text-sm ring-1 ring-inset ring-ink/10 focus:ring-2 focus:ring-ink bg-white"
                    value={rxData.treatmentNotes}
                    onChange={e => setRxData({ ...rxData, treatmentNotes: e.target.value })}
                    placeholder="Additional treatment notes..."
                  />
                </div>

                {/* Medicines (manual input) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-ink">Medicines *</label>
                    <button type="button" onClick={addMedicine} className="text-xs font-medium text-teal hover:underline">
                      + Add medicine
                    </button>
                  </div>
                  <div className="space-y-3">
                    {rxData.medicines.map((med, idx) => (
                      <div key={idx} className="rounded-xl bg-canvas/50 p-3 ring-1 ring-ink/5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-ink/50">Medicine {idx + 1}</span>
                          {rxData.medicines.length > 1 && (
                            <button type="button" onClick={() => removeMedicine(idx)} className="text-xs text-coral hover:underline">
                              Remove
                            </button>
                          )}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input
                            type="text"
                            placeholder="Medicine name *"
                            className="rounded-lg border-0 p-2 text-sm ring-1 ring-inset ring-ink/10 bg-white"
                            value={med.medicineName}
                            onChange={e => updateMedicine(idx, 'medicineName', e.target.value)}
                          />
                          <input
                            type="text"
                            placeholder="Dosage (e.g. 500mg) *"
                            className="rounded-lg border-0 p-2 text-sm ring-1 ring-inset ring-ink/10 bg-white"
                            value={med.dosage}
                            onChange={e => updateMedicine(idx, 'dosage', e.target.value)}
                          />
                          <input
                            type="text"
                            placeholder="Frequency (e.g. twice daily) *"
                            className="rounded-lg border-0 p-2 text-sm ring-1 ring-inset ring-ink/10 bg-white"
                            value={med.frequency}
                            onChange={e => updateMedicine(idx, 'frequency', e.target.value)}
                          />
                          <input
                            type="text"
                            placeholder="Duration (e.g. 7 days) *"
                            className="rounded-lg border-0 p-2 text-sm ring-1 ring-inset ring-ink/10 bg-white"
                            value={med.duration}
                            onChange={e => updateMedicine(idx, 'duration', e.target.value)}
                          />
                        </div>
                        <select
                          className="mt-2 w-full rounded-lg border-0 p-2 text-sm ring-1 ring-inset ring-ink/10 bg-white"
                          value={med.route}
                          onChange={e => updateMedicine(idx, 'route', e.target.value)}
                        >
                          <option value="oral">Oral</option>
                          <option value="topical">Topical</option>
                          <option value="injection">Injection</option>
                          <option value="inhalation">Inhalation</option>
                          <option value="iv">IV</option>
                          <option value="other">Other</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Special instructions (optional)"
                          className="mt-2 w-full rounded-lg border-0 p-2 text-sm ring-1 ring-inset ring-ink/10 bg-white"
                          value={med.specialInstructions}
                          onChange={e => updateMedicine(idx, 'specialInstructions', e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={rxLoading}
                    className="flex-1 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink/90 disabled:opacity-50"
                  >
                    {rxLoading ? 'Saving...' : 'Save Prescription'}
                  </button>
                  <button
                    type="button"
                    onClick={skipPrescription}
                    className="rounded-xl px-4 py-2.5 text-sm font-medium text-ink/60 ring-1 ring-ink/10 hover:bg-canvas/70"
                  >
                    Skip
                  </button>
                </div>
              </form>
            </SectionCard>
          ) : activeConsultation ? (
            /* ── Active Consultation ── */
            <SectionCard title="Active Consultation" eyebrow="In session">
              <div className="space-y-5 rounded-2xl bg-white/70 p-5 ring-1 ring-coral/20">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-coral" />
                  </span>
                  <h3 className="font-display text-lg text-coral">Consultation in progress</h3>
                </div>

                <div className="rounded-xl bg-canvas/50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/40">Patient</p>
                  <p className="mt-0.5 text-sm font-medium">
                    {activeConsultation.patientId?.fullName || 'Patient'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink">Observations & Clinical Notes</label>
                  <textarea
                    rows={5}
                    className="mt-1.5 block w-full rounded-xl border-0 p-3 text-sm ring-1 ring-inset ring-ink/10 focus:ring-2 focus:ring-ink bg-white"
                    value={consultationNotes}
                    onChange={e => setConsultationNotes(e.target.value)}
                    placeholder="Symptoms discussed, examination findings, observations..."
                  />
                </div>

                <button
                  onClick={finishConsultation}
                  className="w-full rounded-xl bg-coral px-4 py-3 text-sm font-semibold text-white hover:bg-coral/90"
                >
                  Mark Consultation Complete
                </button>
              </div>
            </SectionCard>
          ) : (
            /* ── Empty state ── */
            <SectionCard title="Consultation" eyebrow="Session">
              <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-ink/10 bg-white/30 text-sm text-ink/50 gap-2">
                <p>Select a patient to begin consultation</p>
                <p className="text-[10px] text-ink/30">Only patients assigned to you appear here</p>
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  )
}
