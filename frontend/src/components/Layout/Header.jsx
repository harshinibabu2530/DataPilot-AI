import { useLocation, useNavigate } from 'react-router-dom'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { Database, Loader2, LogOut, User, ChevronDown, Palette } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

const PAGE_TITLES = {
  '/upload':    { title: 'Upload Dataset',      sub: 'Import your data file to begin analysis' },
  '/dashboard': { title: 'Auto Dashboard',      sub: 'AI-generated charts and KPI metrics' },
  '/eda':       { title: 'Exploratory Analysis', sub: 'Statistical summaries and distributions' },
  '/insights':  { title: 'AI Insights',         sub: 'AI-generated business intelligence' },
  '/chat':      { title: 'Analytics Chatbot',   sub: 'Ask questions about your dataset' },
  '/report':    { title: 'PDF Report',          sub: 'Download your analytics report' },
  '/history':   { title: 'Dataset History',     sub: 'All your past uploads and analyses' },
  '/predictive': { title: 'Predictive Suite',    sub: 'ML forecasting and individual risk classifications' },
}

export default function Header() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { filename, rowCount, columnCount, loading } = useData()
  const { user, signOut } = useAuth()
  const { theme, setTheme, preset, presets } = useTheme()

  const page = PAGE_TITLES[pathname] || { title: 'DataPilot AI', sub: '' }
  const anyLoading = Object.values(loading).some(Boolean)

  const [dropOpen, setDropOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const dropRef = useRef(null)
  const themeRef = useRef(null)

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false)
      if (themeRef.current && !themeRef.current.contains(e.target)) setThemeOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSignOut = async () => {
    setDropOpen(false)
    await signOut()
    navigate('/login')
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const avatarLetter = displayName[0].toUpperCase()
  const avatarUrl = user?.user_metadata?.avatar_url

  return (
    <header className="px-6 py-4 flex items-center justify-between shrink-0 transition-colors duration-300" style={{
      position: 'relative',
      zIndex: 40,
      background: 'var(--surface-800)',
      borderBottom: '1px solid var(--border)',
      backdropFilter: 'blur(8px)',
    }}>
      {/* Page title */}
      <div>
        <h1 className="text-lg font-bold text-white transition-all duration-300">{page.title}</h1>
        <p className="text-sm text-slate-500">{page.sub}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Processing indicator */}
        {anyLoading && (
          <div className="flex items-center gap-2 text-sm transition-all duration-300" style={{ color: 'var(--brand)' }}>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Processing...</span>
          </div>
        )}

        {/* Dataset info badge */}
        {filename && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all duration-300"
            style={{ background: 'var(--border)', border: '1px solid var(--border)' }}>
            <Database className="w-4 h-4 transition-all duration-300" style={{ color: 'var(--brand)' }} />
            <span className="text-slate-300 font-medium">{rowCount?.toLocaleString()} rows</span>
            <span className="text-slate-600">×</span>
            <span className="text-slate-300">{columnCount} cols</span>
          </div>
        )}

        {/* Theme Picker Dropdown */}
        <div className="relative" ref={themeRef}>
          <button
            id="header-theme-menu"
            onClick={() => setThemeOpen(o => !o)}
            className="flex items-center gap-2 p-2 rounded-xl transition-all hover:bg-white/5 text-slate-400 hover:text-white"
            style={{ background: themeOpen ? 'rgba(255,255,255,0.05)' : 'transparent' }}
            title="Choose theme"
          >
            <Palette size={18} className="transition-transform hover:rotate-12" style={{ color: 'var(--brand)' }} />
            <span className="hidden lg:block text-xs font-semibold uppercase tracking-wider">Theme</span>
          </button>

          {/* Theme Dropdown Menu */}
          {themeOpen && (
            <div className="absolute right-0 top-12 w-64 rounded-xl py-2.5 z-50 transition-all duration-300"
              style={{
                background: 'var(--surface-800)',
                border: '1px solid var(--border)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                backdropFilter: 'blur(20px)',
              }}>
              <div className="px-4 py-2 border-b mb-1.5" style={{ borderColor: 'var(--border)' }}>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Interface Style</span>
              </div>
              <div className="px-2 space-y-1">
                {Object.values(presets).map((p) => {
                  const isActive = theme === p.id
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setTheme(p.id)
                        setThemeOpen(false)
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all text-left"
                      style={{
                        background: isActive ? 'rgba(255,255,255,0.04)' : 'transparent',
                        color: isActive ? '#fff' : '#94a3b8',
                      }}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className={`w-1.5 h-1.5 rounded-full transition-all ${isActive ? 'scale-100' : 'scale-0'}`} style={{ backgroundColor: p.primary }} />
                        {p.name}
                      </span>
                      {/* Dual pill visual color preview */}
                      <span className="flex items-center gap-1">
                        <span className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: p.primary }} />
                        <span className="w-3.5 h-3.5 rounded-full shadow-sm -ml-2" style={{ backgroundColor: p.secondary }} />
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* User avatar + dropdown */}
        {user && (
          <div className="relative" ref={dropRef}>
            <button
              id="header-user-menu"
              onClick={() => setDropOpen(o => !o)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all"
              style={{ background: dropOpen ? 'rgba(255,255,255,0.05)' : 'transparent' }}
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold transition-all duration-300"
                style={{ background: 'linear-gradient(135deg,var(--brand),var(--violet))', color: '#fff' }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                  : avatarLetter
                }
              </div>
              <span className="hidden md:block text-sm font-medium text-slate-300 max-w-[120px] truncate">
                {displayName}
              </span>
              <ChevronDown size={14} className={`text-slate-500 transition-transform ${dropOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {dropOpen && (
              <div className="absolute right-0 top-12 w-56 rounded-xl py-2 z-50 transition-all duration-300"
                style={{
                  background: 'var(--surface-800)',
                  border: '1px solid var(--border)',
                  boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(20px)',
                }}>

                {/* User info */}
                <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                  <div className="text-sm font-semibold text-white truncate">{displayName}</div>
                  <div className="text-xs text-slate-500 truncate mt-0.5">{user.email}</div>
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <button
                    id="dropdown-profile"
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-left"
                  >
                    <User size={15} />
                    Profile
                  </button>
                  <button
                    id="dropdown-signout"
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left"
                  >
                    <LogOut size={15} />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
