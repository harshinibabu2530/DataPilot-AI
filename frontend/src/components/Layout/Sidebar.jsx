import { NavLink, useNavigate } from 'react-router-dom'
import {
  UploadCloud, LayoutDashboard, BarChart3, Lightbulb,
  MessageSquare, FileText, Zap, LogOut, History, TrendingUp
} from 'lucide-react'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'

const NAV = [
  { to: '/upload',     icon: UploadCloud,     label: 'Upload',     step: 0 },
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard',  step: 4 },
  { to: '/eda',        icon: BarChart3,       label: 'EDA',        step: 3 },
  { to: '/predictive', icon: TrendingUp,      label: 'Predictive', step: 3 },
  { to: '/insights',   icon: Lightbulb,       label: 'Insights',   step: 5 },
  { to: '/chat',       icon: MessageSquare,   label: 'Chat',       step: 1 },
  { to: '/report',     icon: FileText,        label: 'Report',     step: 5 },
  { to: '/history',    icon: History,         label: 'History',    step: -1 },
]

export default function Sidebar() {
  const { filename, currentStep, domain } = useData()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const avatarLetter = displayName[0].toUpperCase()
  const avatarUrl = user?.user_metadata?.avatar_url

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className="w-64 flex flex-col shrink-0" style={{
      background: 'var(--surface-800)',
      borderRight: '1px solid var(--border)',
      transition: 'background-color 0.3s ease, border-color 0.3s ease',
    }}>
      {/* Logo */}
      <div className="p-5 border-b transition-colors duration-300" style={{ borderColor: 'var(--border)' }}>
        <button onClick={() => navigate('/')} className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300"
            style={{ background: 'linear-gradient(135deg,var(--brand),var(--violet))' }}>
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-white text-sm">DataPilot</div>
            <div className="text-xs transition-colors duration-300" style={{ color: 'var(--brand)' }}>AI Analytics</div>
          </div>
        </button>
      </div>

      {/* Dataset Badge */}
      {filename && (
        <div className="mx-4 mt-4 p-3 rounded-xl transition-all duration-300" style={{
          background: 'var(--border)',
          border: '1px solid var(--border)',
        }}>
          <div className="text-xs text-slate-500 mb-0.5">Active Dataset</div>
          <div className="text-sm font-medium text-slate-200 truncate">{filename}</div>
          <div className="text-xs mt-1 transition-colors duration-300" style={{ color: 'var(--brand)' }}>
            {domain !== 'generic' ? `Domain: ${domain}` : 'General Analytics'}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="text-xs font-semibold text-slate-600 uppercase tracking-widest px-4 mb-3">
          Pipeline
        </div>
        {NAV.map(({ to, icon: Icon, label, step }) => {
          const locked = !filename && step > 0
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? 'active' : ''} ${locked ? 'opacity-40 pointer-events-none' : ''}`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {currentStep >= step && step > 0 && filename && (
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--emerald)' }} />
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Pipeline progress */}
      {filename && (
        <div className="px-4 pb-2 pt-2 transition-colors duration-300" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Pipeline Progress</span>
            <span>{Math.min(Math.round((currentStep / 6) * 100), 100)}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${Math.min((currentStep / 6) * 100, 100)}%` }} />
          </div>
        </div>
      )}

      {/* User profile footer */}
      <div className="p-3 border-t transition-colors duration-300" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl transition-all duration-300"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>

          {/* Avatar */}
          <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all duration-300"
            style={{ background: 'linear-gradient(135deg,var(--brand),var(--violet))', color: '#fff' }}>
            {avatarUrl
              ? <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              : avatarLetter
            }
          </div>

          {/* Name & email */}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-200 truncate">{displayName}</div>
            <div className="text-xs text-slate-600 truncate">{user?.email}</div>
          </div>

          {/* Sign out */}
          <button
            id="sidebar-signout"
            onClick={handleSignOut}
            title="Sign out"
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
