import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Zap } from 'lucide-react'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--surface-900)' }}>
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="auth-logo-icon animate-pulse">
              <Zap size={22} className="text-white" />
            </div>
          </div>
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
