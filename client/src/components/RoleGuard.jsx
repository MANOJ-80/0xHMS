import { useAuth } from './AuthProvider'
import { Navigate } from 'react-router-dom'

/**
 * Wraps a page component and enforces role-based access.
 * If the user doesn't have the required role, redirect to their home.
 *
 * @param {string[]} roles - Allowed roles for this route
 * @param {React.ReactNode} children - The page element
 */
export default function RoleGuard({ roles, children }) {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!roles.includes(user.role)) {
    const home =
      user.role === 'patient'
        ? '/patient-dashboard'
        : user.role === 'doctor'
          ? '/doctor-dashboard'
          : '/'
    return <Navigate to={home} replace />
  }

  return children
}
