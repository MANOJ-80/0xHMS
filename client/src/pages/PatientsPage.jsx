import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SectionCard from '../components/SectionCard'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import Pagination from '../components/Pagination'
import { apiFetch } from '../lib/api'
import toast from 'react-hot-toast'

const PAGE_SIZE = 12

export default function PatientsPage() {
  const navigate = useNavigate()
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    apiFetch('/patients')
      .then((data) => setPatients(data.patients || []))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = search
    ? patients.filter(p =>
        p.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        p.patientCode?.toLowerCase().includes(search.toLowerCase()) ||
        p.phone?.includes(search) ||
        p.email?.toLowerCase().includes(search.toLowerCase())
      )
    : patients

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold">Patients</h1>
        <div className="relative">
          <input
            type="text"
            placeholder="Search by name, code, phone..."
            className="w-64 rounded-xl border-0 py-2 pl-9 pr-3 text-sm ring-1 ring-inset ring-ink/10 bg-white placeholder:text-ink/40 focus:ring-2 focus:ring-ink"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <SectionCard title="Patient Directory" eyebrow={`${filtered.length} record${filtered.length !== 1 ? 's' : ''}`}>
        {loading ? (
          <LoadingSpinner message="Loading patients..." />
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-ink/10">
              <table className="min-w-full divide-y divide-ink/10 text-left text-sm">
                <thead className="bg-sand/25 text-ink/60">
                  <tr>
                    <th className="px-4 py-3 font-medium">Code</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/5 bg-white/70">
                  {paginated.length > 0 ? paginated.map((patient) => (
                    <tr key={patient._id} onClick={() => navigate(`/patients/${patient._id}`)} className="hover:bg-canvas/30 transition cursor-pointer">
                      <td className="px-4 py-3 font-mono text-xs text-ink/50">{patient.patientCode}</td>
                      <td className="px-4 py-3 font-medium text-teal hover:underline">{patient.fullName}</td>
                      <td className="px-4 py-3 text-ink/70">{patient.phone || 'N/A'}</td>
                      <td className="px-4 py-3 text-ink/70">{patient.email || 'N/A'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={patient.isActive ? 'active' : 'inactive'} />
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-ink/50">
                        {search ? 'No patients match your search.' : 'No patients found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </SectionCard>
    </div>
  )
}
