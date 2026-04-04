import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SectionCard from '../components/SectionCard'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import { apiFetch } from '../lib/api'
import { useAuth } from '../components/AuthProvider'
import { useQueuePolling } from '../lib/useQueuePolling'
import toast from 'react-hot-toast'

const AVAILABILITY_OPTIONS = ['available', 'busy', 'on_break', 'offline']

const emptyMedicine = { medicineName: '', dosage: '', frequency: '', duration: '', reasonForChosen: '', route: 'oral', instructions: '' }

const LOCAL_MEDICINES = [
  // Pain, Fever, Inflammation
  { term: 'Paracetamol', displayName: 'Paracetamol 500mg', strengths: '500mg, 650mg Oral Tablet', defaultReason: 'Fever', defaultDosage: '500mg', defaultFrequency: 'As needed (SOS)', defaultDuration: '3 days' },
  { term: 'Dolo', displayName: 'Dolo 650', strengths: '650mg Oral Tablet', defaultReason: 'Fever', defaultDosage: '650mg', defaultFrequency: 'As needed (SOS)', defaultDuration: '3 days' },
  { term: 'Calpol', displayName: 'Calpol', strengths: '500mg, 650mg Oral Tablet', defaultReason: 'Fever', defaultDosage: '500mg', defaultFrequency: 'As needed (SOS)', defaultDuration: '3 days' },
  { term: 'Crocin', displayName: 'Crocin Advance', strengths: '500mg Oral Tablet', defaultReason: 'Fever / Body Ache', defaultDosage: '500mg', defaultFrequency: 'As needed (SOS)', defaultDuration: '3 days' },
  { term: 'Combiflam', displayName: 'Combiflam', strengths: 'Ibuprofen 400mg + Paracetamol 325mg Oral Tablet', defaultReason: 'Pain / Inflammation', defaultDosage: '1 Tablet', defaultFrequency: 'Twice daily (BD)', defaultDuration: '3 days' },
  { term: 'Citracin', displayName: 'Citracin', strengths: 'Citicoline Oral Tablet', defaultReason: 'Neurological Support / Memory', defaultDosage: '500mg', defaultFrequency: 'Once daily (OD)', defaultDuration: '1 month' },
  { term: 'Voveran', displayName: 'Voveran SR', strengths: '75mg, 100mg Oral Tablet', defaultReason: 'Severe Pain', defaultDosage: '75mg', defaultFrequency: 'Twice daily (BD)', defaultDuration: '5 days' },
  { term: 'Meftal', displayName: 'Meftal Spas', strengths: 'Mefenamic Acid + Dicyclomine Oral Tablet', defaultReason: 'Stomach Cramps', defaultDosage: '1 Tablet', defaultFrequency: 'Twice daily (BD)', defaultDuration: '2 days' },
  // Antibiotics
  { term: 'Augmentin', displayName: 'Augmentin 625 Duo', strengths: 'Amoxicillin 500mg + Clavulanic Acid 125mg', defaultReason: 'Bacterial Infection', defaultDosage: '625mg', defaultFrequency: 'Twice daily (BD)', defaultDuration: '5 days' },
  { term: 'Taxim', displayName: 'Taxim O', strengths: 'Cefixime 200mg Oral Tablet', defaultReason: 'Bacterial Infection', defaultDosage: '200mg', defaultFrequency: 'Twice daily (BD)', defaultDuration: '5 days' },
  { term: 'Metrogyl', displayName: 'Metrogyl', strengths: '400mg Oral Tablet', defaultReason: 'Amoebiasis / Infection', defaultDosage: '400mg', defaultFrequency: 'Three times daily (TDS)', defaultDuration: '5 days' },
  { term: 'Norflox', displayName: 'Norflox TZ', strengths: 'Norfloxacin + Tinidazole', defaultReason: 'Diarrhea / Dysentery', defaultDosage: '1 Tablet', defaultFrequency: 'Twice daily (BD)', defaultDuration: '3 days' },
  { term: 'O2', displayName: 'O2', strengths: 'Ofloxacin 200mg + Ornidazole 500mg', defaultReason: 'Diarrhea / Infection', defaultDosage: '1 Tablet', defaultFrequency: 'Twice daily (BD)', defaultDuration: '3 days' },
  { term: 'Zifi', displayName: 'Zifi 200', strengths: 'Cefixime 200mg Oral Tablet', defaultReason: 'Bacterial Infection', defaultDosage: '200mg', defaultFrequency: 'Twice daily (BD)', defaultDuration: '5 days' },
  { term: 'Cefakind', displayName: 'Cefakind 500', strengths: 'Cefuroxime 500mg Oral Tablet', defaultReason: 'Bacterial Infection', defaultDosage: '500mg', defaultFrequency: 'Twice daily (BD)', defaultDuration: '5 days' },
  // Acidity / Digestion
  { term: 'Pan', displayName: 'Pan 40', strengths: 'Pantoprazole 40mg Oral Tablet', defaultReason: 'Acidity / Gastritis', defaultDosage: '40mg', defaultFrequency: 'Once daily (OD) - Before Breakfast', defaultDuration: '5 days' },
  { term: 'Pantocid', displayName: 'Pantocid DSR', strengths: 'Pantoprazole 40mg + Domperidone 30mg', defaultReason: 'Acidity / Nausea', defaultDosage: '1 Capsule', defaultFrequency: 'Once daily (OD) - Before Breakfast', defaultDuration: '5 days' },
  { term: 'Omee', displayName: 'Omee', strengths: 'Omeprazole 20mg Oral Capsule', defaultReason: 'Acidity', defaultDosage: '20mg', defaultFrequency: 'Once daily (OD)', defaultDuration: '5 days' },
  { term: 'Rantac', displayName: 'Rantac 150', strengths: 'Ranitidine 150mg Oral Tablet', defaultReason: 'Acidity', defaultDosage: '150mg', defaultFrequency: 'Twice daily (BD)', defaultDuration: '5 days' },
  { term: 'Digene', displayName: 'Digene Antacid', strengths: 'Oral Liquid / Tablet', defaultReason: 'Acidity', defaultDosage: '10ml / 1 Tablet', defaultFrequency: 'As needed (SOS)', defaultDuration: '3 days' },
  // Allergies, Cough, Cold
  { term: 'Allegra', displayName: 'Allegra', strengths: '120mg, 180mg Oral Tablet', defaultReason: 'Allergy', defaultDosage: '120mg', defaultFrequency: 'Once daily (OD)', defaultDuration: '5 days' },
  { term: 'Okacet', displayName: 'Okacet', strengths: 'Cetirizine 10mg Oral Tablet', defaultReason: 'Allergy / Cold', defaultDosage: '10mg', defaultFrequency: 'Once daily (OD) - Bedtime', defaultDuration: '3 days' },
  { term: 'Montair', displayName: 'Montair LC', strengths: 'Montelukast 10mg + Levocetirizine 5mg', defaultReason: 'Allergy / Asthma', defaultDosage: '1 Tablet', defaultFrequency: 'Once daily (OD) - Bedtime', defaultDuration: '5 days' },
  { term: 'Honitus', displayName: 'Dabur Honitus', strengths: 'Herbal Cough Syrup', defaultReason: 'Cough', defaultDosage: '10ml', defaultFrequency: 'Three times daily (TDS)', defaultDuration: '5 days' },
  { term: 'Ascoril', displayName: 'Ascoril LS', strengths: 'Expectorant Syrup', defaultReason: 'Cough with Phlegm', defaultDosage: '10ml', defaultFrequency: 'Three times daily (TDS)', defaultDuration: '5 days' },
  { term: 'Corex', displayName: 'Corex DX', strengths: 'Cough Syrup', defaultReason: 'Dry Cough', defaultDosage: '10ml', defaultFrequency: 'Twice daily (BD)', defaultDuration: '3 days' },
  // Nausea / Vomiting
  { term: 'Ondem', displayName: 'Ondem 4', strengths: 'Ondansetron 4mg Oral Tablet', defaultReason: 'Nausea / Vomiting', defaultDosage: '4mg', defaultFrequency: 'As needed (SOS)', defaultDuration: '2 days' },
  { term: 'Vomitrol', displayName: 'Vomitrol', strengths: 'Oral Tablet', defaultReason: 'Vomiting', defaultDosage: '1 Tablet', defaultFrequency: 'As needed (SOS)', defaultDuration: '2 days' },
  // Chronic (BP, Diabetes, Thyroid)
  { term: 'Telma', displayName: 'Telma 40', strengths: 'Telmisartan 40mg Oral Tablet', defaultReason: 'Hypertension (BP)', defaultDosage: '40mg', defaultFrequency: 'Once daily (OD)', defaultDuration: '1 month' },
  { term: 'Amlokind', displayName: 'Amlokind 5', strengths: 'Amlodipine 5mg Oral Tablet', defaultReason: 'Hypertension (BP)', defaultDosage: '5mg', defaultFrequency: 'Once daily (OD)', defaultDuration: '1 month' },
  { term: 'Glycomet', displayName: 'Glycomet 500', strengths: 'Metformin 500mg Oral Tablet', defaultReason: 'Diabetes', defaultDosage: '500mg', defaultFrequency: 'Twice daily (BD) - After Meals', defaultDuration: '1 month' },
  { term: 'Amaryl', displayName: 'Amaryl 1mg', strengths: 'Glimepiride 1mg Oral Tablet', defaultReason: 'Diabetes', defaultDosage: '1mg', defaultFrequency: 'Once daily (OD) - Before Breakfast', defaultDuration: '1 month' },
  { term: 'Thyronorm', displayName: 'Thyronorm', strengths: '25mcg, 50mcg, 75mcg, 100mcg', defaultReason: 'Hypothyroidism', defaultDosage: '50mcg', defaultFrequency: 'Once daily (OD) - Empty Stomach', defaultDuration: '1 month' },
  { term: 'Atorva', displayName: 'Atorva 10', strengths: 'Atorvastatin 10mg Oral Tablet', defaultReason: 'High Cholesterol', defaultDosage: '10mg', defaultFrequency: 'Once daily (OD) - Bedtime', defaultDuration: '1 month' },
  { term: 'Rosuvas', displayName: 'Rosuvas 10', strengths: 'Rosuvastatin 10mg Oral Tablet', defaultReason: 'High Cholesterol', defaultDosage: '10mg', defaultFrequency: 'Once daily (OD) - Bedtime', defaultDuration: '1 month' },
  // Supplements / Basics
  { term: 'Shelcal', displayName: 'Shelcal 500', strengths: 'Calcium 500mg + Vitamin D3', defaultReason: 'Calcium Supplement', defaultDosage: '1 Tablet', defaultFrequency: 'Once daily (OD)', defaultDuration: '1 month' },
  { term: 'Neurobion', displayName: 'Neurobion Forte', strengths: 'Vitamin B Complex', defaultReason: 'Vitamin B Deficiency', defaultDosage: '1 Tablet', defaultFrequency: 'Once daily (OD)', defaultDuration: '1 month' },
  { term: 'Ecosprin', displayName: 'Ecosprin 75', strengths: 'Aspirin 75mg', defaultReason: 'Heart Health / Blood Thinner', defaultDosage: '75mg', defaultFrequency: 'Once daily (OD)', defaultDuration: '1 month' },
]

const DOSAGE_OPTIONS = ['100mg', '250mg', '500mg', '650mg', '1g', '5ml', '10ml', '1 drop', '2 drops']
const FREQUENCY_OPTIONS = ['Once daily (OD)', 'Twice daily (BD)', 'Three times daily (TDS)', 'Four times daily (QID)', 'As needed (SOS)']
const DURATION_OPTIONS = ['1 day', '2 days', '3 days', '5 days', '7 days', '10 days', '14 days', '1 month', 'Ongoing']
const REASON_OPTIONS = ['Fever', 'Pain', 'Infection', 'Cough', 'Cold', 'Nausea/Vomiting', 'Acidity/Gas', 'Allergy', 'Asthma', 'Diabetes', 'Hypertension']

export default function DoctorDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [assignedPatients, setAssignedPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeConsultation, setActiveConsultation] = useState(null)
  const [consultationNotes, setConsultationNotes] = useState('')
  const [availability, setAvailability] = useState('available')

  // Prescription form state
  const [showRxForm, setShowRxForm] = useState(false)
  const [rxData, setRxData] = useState({ diagnosis: '', treatmentNotes: '', medicines: [{ ...emptyMedicine }] })
  const [rxLoading, setRxLoading] = useState(false)

  // Autocomplete state
  const [rxSearchCache, setRxSearchCache] = useState({})
  const [rxSuggestions, setRxSuggestions] = useState([])
  const [focusedMedIndex, setFocusedMedIndex] = useState(null)

  // Patient history expansion
  const [expandedPatient, setExpandedPatient] = useState(null)
  const [patientHistory, setPatientHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Upcoming appointments (scheduled but not yet checked in)
  const [upcomingAppointments, setUpcomingAppointments] = useState([])
  const [upcomingLoading, setUpcomingLoading] = useState(true)

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

  const fetchUpcomingAppointments = async () => {
    if (!doctorId) return
    try {
      const data = await apiFetch(`/doctors/${doctorId}/appointments`)
      setUpcomingAppointments(data.appointments || [])
    } catch {
      setUpcomingAppointments([])
    } finally {
      setUpcomingLoading(false)
    }
  }

  useEffect(() => {
    fetchAssignedPatients()
    fetchUpcomingAppointments()
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
    } catch (err) {
      console.error('Error completing consultation:', err.message)
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

  const handleMedicineSearch = async (idx, query) => {
    updateMedicine(idx, 'medicineName', query)
    if (!query || query.length < 2) {
      setRxSuggestions([])
      return
    }

    if (rxSearchCache[query]) {
      setRxSuggestions(rxSearchCache[query])
      return
    }

    try {
      const qLower = query.toLowerCase()
      const localMatches = LOCAL_MEDICINES.filter(m => 
        m.displayName.toLowerCase().includes(qLower) || 
        m.term.toLowerCase().includes(qLower)
      )

      const res = await fetch(`https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search?terms=${encodeURIComponent(query)}&ef=DISPLAY_NAME,STRENGTHS_AND_FORMS`)
      const data = await res.json()
      // data format: [count, [terms], null, [[DISPLAY_NAME...], [STRENGTHS...]]]
      const apiSuggestions = (data[1] || []).map((term, i) => ({
        term,
        displayName: data[3]?.[0]?.[i] || term,
        strengths: data[3]?.[1]?.[i] || ''
      }))
      
      const combined = [...localMatches, ...apiSuggestions]
      setRxSearchCache(prev => ({ ...prev, [query]: combined }))
      setRxSuggestions(combined)
    } catch (e) {
      console.error(e)
    }
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
      if (!med.dosage.trim() || !med.frequency.trim() || !med.duration.trim() || !med.reasonForChosen.trim()) {
        toast.error(`Complete all marked fields for ${med.medicineName}`)
        return
      }
    }

    setRxLoading(true)
    try {
      // First, complete the consultation
      await finishConsultation()

      // Then save the prescription
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
      toast.success('Prescription saved & consultation completed')
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

  const skipPrescription = async () => {
    await finishConsultation()
    setShowRxForm(false)
    setActiveConsultation(null)
    setConsultationNotes('')
    setRxData({ diagnosis: '', treatmentNotes: '', medicines: [{ ...emptyMedicine }] })
    fetchAssignedPatients()
    toast.success('Consultation completed (no prescription)')
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
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/doctors/${doctorId}`)}
            className="rounded-full bg-teal/10 px-4 py-1.5 text-xs font-medium text-teal hover:bg-teal/20 transition"
          >
            My History
          </button>
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

      {/* Today's Schedule – upcoming appointments not yet checked in */}
      <SectionCard title="Today's Schedule" eyebrow={`${upcomingAppointments.length} upcoming`}>
        {upcomingLoading ? (
          <LoadingSpinner message="Loading schedule..." />
        ) : upcomingAppointments.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-2xl border border-dashed border-ink/10 bg-white/30 text-sm text-ink/50">
            No upcoming appointments scheduled for today
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {upcomingAppointments.map((apt) => (
              <div key={apt._id} className="rounded-2xl bg-white/70 p-4 ring-1 ring-ink/10">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-sand/40 font-display text-sm font-bold text-ink/70">
                    {new Date(apt.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-semibold text-teal cursor-pointer hover:underline" onClick={() => navigate(`/patients/${apt.patientId?._id}`)}>{apt.patientId?.fullName || 'Unknown'}</h4>
                    <p className="text-xs text-ink/50">{apt.patientId?.patientCode}</p>
                  </div>
                </div>
                {apt.notes && <p className="mt-2 text-xs text-ink/40 line-clamp-2">{apt.notes}</p>}
                <div className="mt-2">
                  <StatusBadge status="scheduled" label="Awaiting check-in" />
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

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
                        <h4 className="text-sm font-semibold text-teal cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); navigate(`/patients/${item.patientId?._id}`) }}>{item.patientId?.fullName || 'Unknown'}</h4>
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

        {/* Right panel: consultation + prescription combined */}
        <div className="space-y-6">
          {activeConsultation ? (
            /* ── Active Consultation + Inline Prescription ── */
            <SectionCard title="Active Consultation" eyebrow="In session">
              {/* Consultation header */}
              <div className="space-y-4 rounded-2xl bg-white/70 p-5 ring-1 ring-coral/20">
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
                    rows={3}
                    className="mt-1.5 block w-full rounded-xl border-0 p-3 text-sm ring-1 ring-inset ring-ink/10 focus:ring-2 focus:ring-ink bg-white"
                    value={consultationNotes}
                    onChange={e => setConsultationNotes(e.target.value)}
                    placeholder="Symptoms discussed, examination findings, observations..."
                  />
                </div>
              </div>

              {/* Prescription form inline */}
              <form onSubmit={submitPrescription} className="mt-4 space-y-4 rounded-2xl bg-white/70 p-5 ring-1 ring-ink/10">
                <h4 className="text-sm font-semibold text-ink/70 uppercase tracking-wider">Prescription</h4>
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

                <datalist id="dosage-options">{DOSAGE_OPTIONS.map(o => <option key={o} value={o} />)}</datalist>
                <datalist id="frequency-options">{FREQUENCY_OPTIONS.map(o => <option key={o} value={o} />)}</datalist>
                <datalist id="duration-options">{DURATION_OPTIONS.map(o => <option key={o} value={o} />)}</datalist>
                <datalist id="reason-options">{REASON_OPTIONS.map(o => <option key={o} value={o} />)}</datalist>

                {/* Medicines */}
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
                        <div className="grid gap-2 sm:grid-cols-2 mt-2">
                          <div className="relative sm:col-span-2">
                            <input
                              type="text"
                              placeholder="Medicine name (e.g. Dolo 650) *"
                              className="w-full rounded-lg border-0 p-2 text-sm ring-1 ring-inset ring-ink/10 bg-white"
                              value={med.medicineName}
                              onChange={e => {
                                handleMedicineSearch(idx, e.target.value)
                                setFocusedMedIndex(idx)
                              }}
                              onFocus={() => setFocusedMedIndex(idx)}
                              onBlur={() => setTimeout(() => setFocusedMedIndex(null), 200)}
                            />
                            {focusedMedIndex === idx && rxSuggestions.length > 0 && (
                              <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-ink/5">
                                {rxSuggestions.map((sug, i) => (
                                  <div
                                    key={i}
                                    className="cursor-pointer px-3 py-2 text-sm hover:bg-canvas/80"
                                    onClick={() => {
                                      setRxData(prev => ({
                                        ...prev,
                                        medicines: prev.medicines.map((m, i) => {
                                          if (i === idx) {
                                            return {
                                              ...m,
                                              medicineName: sug.displayName,
                                              reasonForChosen: sug.defaultReason || m.reasonForChosen,
                                              dosage: sug.defaultDosage || m.dosage,
                                              frequency: sug.defaultFrequency || m.frequency,
                                              duration: sug.defaultDuration || m.duration,
                                            }
                                          }
                                          return m
                                        })
                                      }))
                                      setRxSuggestions([])
                                      setFocusedMedIndex(null)
                                    }}
                                  >
                                    <div className="font-medium text-ink/90">{sug.displayName}</div>
                                    {sug.strengths && <div className="text-[10px] text-ink/50">{sug.strengths}</div>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <input
                            type="text"
                            list="dosage-options"
                            placeholder="Dosage (e.g. 500mg) *"
                            className="rounded-lg border-0 p-2 text-sm ring-1 ring-inset ring-ink/10 bg-white"
                            value={med.dosage}
                            onChange={e => updateMedicine(idx, 'dosage', e.target.value)}
                          />
                          <input
                            type="text"
                            list="frequency-options"
                            placeholder="Frequency (e.g. twice daily) *"
                            className="rounded-lg border-0 p-2 text-sm ring-1 ring-inset ring-ink/10 bg-white"
                            value={med.frequency}
                            onChange={e => updateMedicine(idx, 'frequency', e.target.value)}
                          />
                          <input
                            type="text"
                            list="duration-options"
                            placeholder="Duration (e.g. 7 days) *"
                            className="rounded-lg border-0 p-2 text-sm ring-1 ring-inset ring-ink/10 bg-white"
                            value={med.duration}
                            onChange={e => updateMedicine(idx, 'duration', e.target.value)}
                          />
                          <input
                            type="text"
                            list="reason-options"
                            placeholder="Reason for chosen *"
                            className="rounded-lg border-0 p-2 text-sm ring-1 ring-inset ring-ink/10 bg-white"
                            value={med.reasonForChosen}
                            onChange={e => updateMedicine(idx, 'reasonForChosen', e.target.value)}
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
                          value={med.instructions}
                          onChange={e => updateMedicine(idx, 'instructions', e.target.value)}
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
                    {rxLoading ? 'Saving...' : 'Save Prescription & Complete'}
                  </button>
                  <button
                    type="button"
                    onClick={skipPrescription}
                    className="rounded-xl px-4 py-2.5 text-sm font-medium text-ink/60 ring-1 ring-ink/10 hover:bg-canvas/70"
                  >
                    Complete without Rx
                  </button>
                </div>
              </form>
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
