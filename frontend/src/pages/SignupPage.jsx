import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, User, Eye, EyeOff, Zap, ArrowRight, Github, CheckCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

// Google SVG Icon
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

const perks = [
  'AI-powered EDA in seconds',
  'Automated data cleaning',
  'Beautiful interactive dashboards',
  'Export PDF reports instantly',
]

export default function SignupPage() {
  const navigate = useNavigate()
  const { signUp, signInWithGoogle, signInWithGitHub } = useAuth()

  const [fullName, setFullName]   = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [oauthLoading, setOauthLoading] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!fullName || !email || !password) return toast.error('Please fill in all fields.')
    if (password.length < 8) return toast.error('Password must be at least 8 characters.')
    setLoading(true)
    try {
      await signUp(email, password, fullName)
      navigate('/login')
    } catch (err) {
      toast.error(err.message || 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setOauthLoading('google')
    try { await signInWithGoogle() }
    catch (err) { toast.error(err.message) }
    finally { setOauthLoading('') }
  }

  const handleGitHub = async () => {
    setOauthLoading('github')
    try { await signInWithGitHub() }
    catch (err) { toast.error(err.message) }
    finally { setOauthLoading('') }
  }

  return (
    <div className="auth-bg">
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />
      <div className="auth-orb auth-orb-3" />

      <div className="auth-wrapper auth-wrapper-wide">
        {/* Left panel — branding */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="auth-brand-panel"
        >
          <div className="auth-logo mb-8">
            <div className="auth-logo-icon">
              <Zap size={22} className="text-white" />
            </div>
            <span className="gradient-text font-bold text-xl">DataPilot AI</span>
          </div>

          <h2 className="text-3xl font-bold text-white mb-3 leading-tight">
            Turn raw data into<br />
            <span className="gradient-text">powerful insights</span>
          </h2>
          <p className="text-slate-400 mb-10 text-sm leading-relaxed">
            Join thousands of data analysts who trust DataPilot AI to automate their analytics workflow.
          </p>

          <ul className="space-y-4">
            {perks.map((perk) => (
              <li key={perk} className="flex items-center gap-3 text-slate-300 text-sm">
                <CheckCircle size={18} className="text-emerald-400 flex-shrink-0" />
                {perk}
              </li>
            ))}
          </ul>

          <div className="auth-brand-footer">
            <div className="auth-avatars">
              {['A','B','C','D'].map((l, i) => (
                <div key={l} className="auth-avatar" style={{ zIndex: 4 - i, marginLeft: i > 0 ? '-10px' : 0 }}>
                  {l}
                </div>
              ))}
            </div>
            <span className="text-slate-400 text-xs">Trusted by 10,000+ analysts</span>
          </div>
        </motion.div>

        {/* Right panel — form */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="auth-card"
        >
          <div className="auth-card-header">
            <h1 className="auth-title">Create your account</h1>
            <p className="auth-subtitle">Free forever. No credit card required.</p>
          </div>

          {/* OAuth Buttons */}
          <div className="oauth-grid">
            <button
              id="btn-google-signup"
              onClick={handleGoogle}
              disabled={!!oauthLoading}
              className="oauth-btn"
            >
              {oauthLoading === 'google' ? <div className="oauth-spinner" /> : <GoogleIcon />}
              <span>Google</span>
            </button>

            <button
              id="btn-github-signup"
              onClick={handleGitHub}
              disabled={!!oauthLoading}
              className="oauth-btn"
            >
              {oauthLoading === 'github' ? <div className="oauth-spinner" /> : <Github size={20} />}
              <span>GitHub</span>
            </button>
          </div>

          <div className="auth-divider">
            <span className="auth-divider-line" />
            <span className="auth-divider-text">or continue with email</span>
            <span className="auth-divider-line" />
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {/* Full Name */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="signup-name">Full name</label>
              <div className="auth-input-wrap">
                <User size={16} className="auth-input-icon" />
                <input
                  id="signup-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Jane Smith"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="auth-input"
                />
              </div>
            </div>

            {/* Email */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="signup-email">Email address</label>
              <div className="auth-input-wrap">
                <Mail size={16} className="auth-input-icon" />
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="auth-input"
                />
              </div>
            </div>

            {/* Password */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="signup-password">Password</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input
                  id="signup-password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="auth-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="auth-eye-btn"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Password strength indicator */}
              {password.length > 0 && (
                <div className="pw-strength">
                  {[1,2,3,4].map(i => (
                    <div
                      key={i}
                      className="pw-bar"
                      style={{
                        background: password.length >= i * 3
                          ? i <= 1 ? '#ef4444'
                          : i === 2 ? '#f59e0b'
                          : i === 3 ? '#6366f1'
                          : '#10b981'
                          : 'rgba(99,102,241,0.15)'
                      }}
                    />
                  ))}
                  <span className="pw-label">
                    {password.length < 4 ? 'Too short' : password.length < 7 ? 'Weak' : password.length < 10 ? 'Good' : 'Strong'}
                  </span>
                </div>
              )}
            </div>

            <button
              id="btn-signup-submit"
              type="submit"
              disabled={loading}
              className="auth-submit-btn"
            >
              {loading ? (
                <div className="auth-spinner-white" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <p className="auth-footer">
            Already have an account?{' '}
            <Link to="/login" className="auth-link">Sign in</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
