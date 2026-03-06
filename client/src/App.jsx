import { NavLink, Route, Routes, Navigate } from 'react-router-dom'
import DashboardPage from './pages/DashboardPage'
import AppointmentsPage from './pages/AppointmentsPage'
import QueueBoardPage from './pages/QueueBoardPage'
import PatientsPage from './pages/PatientsPage'
import DoctorsPage from './pages/DoctorsPage'
import LoginPage from './pages/LoginPage'
import CheckinPage from './pages/CheckinPage'
import DoctorDashboardPage from './pages/DoctorDashboardPage'
import PatientDashboardPage from './pages/PatientDashboardPage'
import { useAuth } from './components/AuthProvider'

export default function App() {
  const { user, loading, logout } = useAuth()

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-mesh text-ink">Loading...</div>
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  let navItems = []
  
  if (user.role === 'admin' || user.role === 'receptionist') {
    navItems = [
      { to: '/', label: 'Overview' },
      { to: '/checkin', label: 'Check-in' },
      { to: '/appointments', label: 'Appointments' },
      { to: '/queue-board', label: 'Queue Board' },
      { to: '/patients', label: 'Patients' },
      { to: '/doctors', label: 'Doctors' },
    ]
  } else if (user.role === 'doctor') {
    navItems = [
      { to: '/doctor-dashboard', label: 'Dr. Dashboard' },
      { to: '/appointments', label: 'Appointments' },
      { to: '/queue-board', label: 'Queue Board' },
    ]
  } else if (user.role === 'patient') {
    navItems = [
      { to: '/patient-dashboard', label: 'My Dashboard' },
    ]
  }

  return (
    <div className="min-h-screen bg-mesh text-ink">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-[28px] border border-white/50 bg-white/75 p-5 shadow-panel backdrop-blur sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full bg-teal/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-teal">
                Smart outpatient operations
              </span>
              <div className="mt-4 flex items-center gap-4">
                <h1 className="font-display text-3xl font-semibold leading-tight sm:text-5xl">
                  Smart Patient Consultation Management System
                </h1>
                <button 
                  onClick={logout}
                  className="rounded-full bg-coral/10 px-4 py-2 text-sm font-medium text-coral hover:bg-coral/20"
                >
                  Logout
                </button>
              </div>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-ink/75 sm:text-base">
                A live coordination workspace for appointments, check-ins, queue visibility, and doctor assignment.
              </p>
            </div>
            <nav className="flex flex-wrap gap-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `rounded-full px-4 py-2 text-sm font-medium transition ${
                      isActive
                        ? 'bg-ink text-white shadow-lg'
                        : 'bg-white text-ink/75 ring-1 ring-ink/10 hover:text-ink'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </header>

        <main className="flex-1">
          <Routes>
            {/* Admin/Receptionist Routes */}
            <Route path="/" element={<DashboardPage />} />
            <Route path="/checkin" element={<CheckinPage />} />
            <Route path="/appointments" element={<AppointmentsPage />} />
            <Route path="/queue-board" element={<QueueBoardPage />} />
            <Route path="/patients" element={<PatientsPage />} />
            <Route path="/doctors" element={<DoctorsPage />} />
            
            {/* Doctor Route */}
            <Route path="/doctor-dashboard" element={<DoctorDashboardPage />} />
            
            {/* Patient Route */}
            <Route path="/patient-dashboard" element={<PatientDashboardPage />} />
            
            <Route path="*" element={
              <Navigate to={user.role === 'patient' ? '/patient-dashboard' : user.role === 'doctor' ? '/doctor-dashboard' : '/'} replace />
            } />
          </Routes>
        </main>
      </div>
    </div>
  )
}
