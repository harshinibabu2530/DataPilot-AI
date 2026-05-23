import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Zap, ArrowLeft, CheckCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]     = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) return toast.error('Please enter your email.')
    setLoading(true)
    try {
      await resetPassword(email)
      setSent(true)
    } catch (err) {
      toast.error(err.message || 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-bg">
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />

      <div className="auth-wrapper">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="auth-logo">
          <div className="auth-logo-icon"><Zap size={22} className="text-white" /></div>
          <span className="gradient-text font-bold text-xl">DataPilot AI</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="auth-card"
        >
          {!sent ? (
            <>
              <div className="auth-card-header">
                <h1 className="auth-title">Reset password</h1>
                <p className="auth-subtitle">Enter your email and we'll send you a reset link.</p>
              </div>

              <form onSubmit={handleSubmit} className="auth-form">
                <div className="auth-field">
                  <label className="auth-label" htmlFor="forgot-email">Email address</label>
                  <div className="auth-input-wrap">
                    <Mail size={16} className="auth-input-icon" />
                    <input
                      id="forgot-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="auth-input"
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="auth-submit-btn">
                  {loading ? <div className="auth-spinner-white" /> : 'Send Reset Link'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="flex justify-center mb-5">
                <CheckCircle size={52} className="text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Check your inbox</h2>
              <p className="text-slate-400 text-sm mb-6">
                We sent a password reset link to <span className="text-indigo-400">{email}</span>
              </p>
            </div>
          )}

          <Link to="/login" className="auth-back-link">
            <ArrowLeft size={16} />
            Back to sign in
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
