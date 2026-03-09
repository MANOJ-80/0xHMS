import { NavLink, Route, Routes, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import DashboardPage from './pages/DashboardPage'
import AppointmentsPage from './pages/AppointmentsPage'
import QueueBoardPage from './pages/QueueBoardPage'
import PatientsPage from './pages/PatientsPage'
import DoctorsPage from './pages/DoctorsPage'
import LoginPage from './pages/LoginPage'
import CheckinPage from './pages/CheckinPage'
import DoctorDashboardPage from './pages/DoctorDashboardPage'
import PatientDashboardPage from './pages/PatientDashboardPage'
import NotificationsPage from './pages/NotificationsPage'
import PrescriptionsPage from './pages/PrescriptionsPage'
import RoleGuard from './components/RoleGuard'
import { useAuth } from './components/AuthProvider'
import { useState } from 'react'

/* ── SVG icon helpers (inline to avoid a dependency) ── */
const icons = {
  overview: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
    </svg>
  ),
  checkin: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  appointments: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  queue: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  ),
  patients: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  doctors: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  notifications: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  prescriptions: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  dashboard: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  ),
  logout: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
}

function getNavItems(role) {
  if (role === 'admin' || role === 'receptionist') {
    return [
      { to: '/', label: 'Overview', icon: icons.overview, end: true },
      { to: '/checkin', label: 'Check-in', icon: icons.checkin },
      { to: '/appointments', label: 'Appointments', icon: icons.appointments },
      { to: '/queue-board', label: 'Queue Board', icon: icons.queue },
      { to: '/patients', label: 'Patients', icon: icons.patients },
      { to: '/doctors', label: 'Doctors', icon: icons.doctors },
      { to: '/notifications', label: 'Notifications', icon: icons.notifications },
      { to: '/prescriptions', label: 'Prescriptions', icon: icons.prescriptions },
    ]
  }
  if (role === 'doctor') {
    return [
      { to: '/doctor-dashboard', label: 'Dashboard', icon: icons.dashboard },
      { to: '/appointments', label: 'Appointments', icon: icons.appointments },
      { to: '/queue-board', label: 'Queue Board', icon: icons.queue },
      { to: '/prescriptions', label: 'Prescriptions', icon: icons.prescriptions },
      { to: '/notifications', label: 'Notifications', icon: icons.notifications },
    ]
  }
  if (role === 'patient') {
    return [
      { to: '/patient-dashboard', label: 'My Dashboard', icon: icons.dashboard },
      { to: '/prescriptions', label: 'Prescriptions', icon: icons.prescriptions },
      { to: '/notifications', label: 'Notifications', icon: icons.notifications },
    ]
  }
  return []
}

export default function App() {
  const { user, loading, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mesh text-ink">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-teal" />
          </span>
          <span className="font-display text-lg">Loading SPCMS...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <>
        <Toaster position="top-right" toastOptions={{ className: 'text-sm font-body', duration: 4000 }} />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </>
    )
  }

  const navItems = getNavItems(user.role)
  const homeRoute = user.role === 'patient' ? '/patient-dashboard' : user.role === 'doctor' ? '/doctor-dashboard' : '/'
  const roleLabel = user.role === 'admin' ? 'Administrator' : user.role === 'receptionist' ? 'Front Desk' : user.role === 'doctor' ? 'Doctor' : 'Patient'

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'text-sm font-body',
          duration: 4000,
          style: { borderRadius: '12px', padding: '12px 16px' },
        }}
      />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex min-h-screen bg-mesh text-ink">
        {/* ── Sidebar ── */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/40 bg-white/80 backdrop-blur-xl transition-transform duration-200 lg:static lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Brand */}
          <div className="flex h-16 items-center gap-3 border-b border-ink/5 px-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal text-white text-xs font-bold">
              SP
            </div>
            <div>
              <p className="text-sm font-display font-semibold leading-tight">SPCMS</p>
              <p className="text-[10px] text-ink/50">{roleLabel}</p>
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <div className="space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? 'bg-ink text-white shadow-sm'
                        : 'text-ink/70 hover:bg-canvas/70 hover:text-ink'
                    }`
                  }
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>

          {/* User section */}
          <div className="border-t border-ink/5 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink/10 text-xs font-semibold text-ink">
                {(user.fullName || user.email || '?').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user.fullName || user.email}</p>
                <p className="text-[10px] text-ink/50 capitalize">{user.role}</p>
              </div>
              <button
                onClick={logout}
                title="Sign out"
                className="rounded-lg p-1.5 text-ink/40 hover:bg-coral/10 hover:text-coral transition"
              >
                {icons.logout}
              </button>
            </div>
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Top bar (mobile) */}
          <header className="flex h-14 items-center gap-3 border-b border-white/40 bg-white/60 px-4 backdrop-blur lg:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-1.5 text-ink/70 hover:bg-canvas/70"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <p className="text-sm font-display font-semibold">SPCMS</p>
          </header>

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">
              <Routes>
                {/* Admin/Receptionist */}
                <Route path="/" element={<RoleGuard roles={['admin', 'receptionist']}><DashboardPage /></RoleGuard>} />
                <Route path="/checkin" element={<RoleGuard roles={['admin', 'receptionist']}><CheckinPage /></RoleGuard>} />
                <Route path="/appointments" element={<RoleGuard roles={['admin', 'receptionist', 'doctor']}><AppointmentsPage /></RoleGuard>} />
                <Route path="/queue-board" element={<RoleGuard roles={['admin', 'receptionist', 'doctor']}><QueueBoardPage /></RoleGuard>} />
                <Route path="/patients" element={<RoleGuard roles={['admin', 'receptionist']}><PatientsPage /></RoleGuard>} />
                <Route path="/doctors" element={<RoleGuard roles={['admin', 'receptionist']}><DoctorsPage /></RoleGuard>} />

                {/* Doctor */}
                <Route path="/doctor-dashboard" element={<RoleGuard roles={['doctor', 'admin']}><DoctorDashboardPage /></RoleGuard>} />

                {/* Patient */}
                <Route path="/patient-dashboard" element={<RoleGuard roles={['patient']}><PatientDashboardPage /></RoleGuard>} />

                {/* Shared pages */}
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/prescriptions" element={<PrescriptionsPage />} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to={homeRoute} replace />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </>
  )
}
