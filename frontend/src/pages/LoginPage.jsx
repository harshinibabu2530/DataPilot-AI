import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, Zap, ArrowRight, Github } from 'lucide-react'
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

export default function LoginPage() {
  const navigate = useNavigate()
  const { signIn, signInWithGoogle, signInWithGitHub } = useAuth()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [oauthLoading, setOauthLoading] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) return toast.error('Please fill in all fields.')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/upload')
    } catch (err) {
      toast.error(err.message || 'Sign in failed')
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
      {/* Animated orbs */}
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />
      <div className="auth-orb auth-orb-3" />

      <div className="auth-wrapper">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="auth-logo"
        >
          <div className="auth-logo-icon">
            <Zap size={22} className="text-white" />
          </div>
          <span className="gradient-text font-bold text-xl">DataPilot AI</span>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="auth-card"
        >
          <div className="auth-card-header">
            <h1 className="auth-title">Welcome back</h1>
            <p className="auth-subtitle">Sign in to continue to DataPilot AI</p>
          </div>

          {/* OAuth Buttons */}
          <div className="oauth-grid">
            <button
              id="btn-google-login"
              onClick={handleGoogle}
              disabled={!!oauthLoading}
              className="oauth-btn"
            >
              {oauthLoading === 'google' ? (
                <div className="oauth-spinner" />
              ) : (
                <GoogleIcon />
              )}
              <span>Google</span>
            </button>

            <button
              id="btn-github-login"
              onClick={handleGitHub}
              disabled={!!oauthLoading}
              className="oauth-btn"
            >
              {oauthLoading === 'github' ? (
                <div className="oauth-spinner" />
              ) : (
                <Github size={20} />
              )}
              <span>GitHub</span>
            </button>
          </div>

          {/* Divider */}
          <div className="auth-divider">
            <span className="auth-divider-line" />
            <span className="auth-divider-text">or continue with email</span>
            <span className="auth-divider-line" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            {/* Email */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="login-email">Email address</label>
              <div className="auth-input-wrap">
                <Mail size={16} className="auth-input-icon" />
                <input
                  id="login-email"
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
              <div className="auth-label-row">
                <label className="auth-label" htmlFor="login-password">Password</label>
                <Link to="/forgot-password" className="auth-forgot">Forgot password?</Link>
              </div>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
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
            </div>

            {/* Submit */}
            <button
              id="btn-login-submit"
              type="submit"
              disabled={loading}
              className="auth-submit-btn"
            >
              {loading ? (
                <div className="auth-spinner-white" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="auth-footer">
            Don't have an account?{' '}
            <Link to="/signup" className="auth-link">Create one free</Link>
          </p>
        </motion.div>

        <p className="auth-legal">
          By signing in, you agree to our{' '}
          <a href="#" className="auth-legal-link">Terms</a> &amp;{' '}
          <a href="#" className="auth-legal-link">Privacy Policy</a>
        </p>
      </div>
    </div>
  )
}
