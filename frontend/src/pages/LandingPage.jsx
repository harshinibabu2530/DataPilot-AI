import { useNavigate } from 'react-router-dom'
import { Zap, Upload, BarChart3, Brain, MessageSquare, FileText, ArrowRight, Database, TrendingUp, Shield, Github } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const FEATURES = [
  { icon: Upload,        title: 'Multi-Format Upload',   desc: 'CSV, Excel, JSON, PDF, DOCX — all supported.' },
  { icon: Database,      title: 'Auto Data Cleaning',    desc: 'Nulls, duplicates, outliers handled automatically.' },
  { icon: BarChart3,     title: 'EDA Engine',            desc: 'Statistical summaries, correlations, distributions.' },
  { icon: TrendingUp,    title: 'Auto Dashboards',       desc: 'KPI cards, charts, heatmaps — generated instantly.' },
  { icon: Brain,         title: 'AI Insights',           desc: 'GPT-powered business intelligence and recommendations.' },
  { icon: MessageSquare, title: 'Chatbot Analytics',     desc: 'Ask questions about your dataset in plain English.' },
  { icon: FileText,      title: 'PDF Reports',           desc: 'Professional downloadable analytics reports.' },
  { icon: Shield,        title: 'Domain-Aware',          desc: 'Finance, HR, Retail, Healthcare, Marketing, Stock.' },
]

const DOMAINS = ['Finance', 'HR & People', 'Retail & Sales', 'Healthcare', 'Marketing', 'Stock Market']
const STEPS = [
  { n: '01', title: 'Upload',      desc: 'Drop your dataset file' },
  { n: '02', title: 'Select Domain', desc: 'Choose your industry' },
  { n: '03', title: 'Auto-Process', desc: 'AI cleans & analyzes' },
  { n: '04', title: 'Explore',     desc: 'Dashboard, EDA, Insights' },
  { n: '05', title: 'Chat',        desc: 'Ask AI your questions' },
  { n: '06', title: 'Download',    desc: 'Get your PDF report' },
]

const STATS = [['9', 'Modules'], ['6', 'Domains'], ['5min', 'To Insights'], ['100%', 'Automated']]

export default function LandingPage() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()

  return (
    <div style={{ background: 'var(--surface-900)', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Navbar ──────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 px-8 py-4 flex items-center justify-between"
        style={{ background: 'rgba(10,15,30,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(99,102,241,0.1)' }}>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white text-lg">DataPilot <span className="gradient-text">AI</span></span>
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm"
                style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff' }}>
                  {(user?.user_metadata?.full_name || user?.email || 'U')[0].toUpperCase()}
                </div>
                <span className="text-slate-300 hidden sm:block">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                </span>
              </div>
              <button onClick={() => navigate('/upload')} className="btn-primary text-sm py-2 px-5">
                Go to App <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button id="nav-signin" onClick={() => navigate('/login')} className="btn-secondary text-sm py-2 px-4">
                Sign In
              </button>
              <button id="nav-getstarted" onClick={() => navigate('/signup')} className="btn-primary text-sm py-2 px-4">
                Get Started <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 px-8 text-center overflow-hidden">
        <div className="absolute top-20 left-1/3 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
        <div className="absolute bottom-10 right-1/4 w-72 h-72 rounded-full opacity-8 blur-3xl"
          style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)' }} />

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-8"
            style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
            <Zap className="w-3.5 h-3.5" />
            AI-Powered Analytics Platform
          </div>

          <h1 className="text-6xl font-black text-white mb-6 leading-tight">
            Turn Raw Data into{' '}
            <span className="gradient-text">Intelligent Insights</span>
            {' '}in Minutes
          </h1>

          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Upload any dataset and let DataPilot AI automatically clean, analyze, visualize,
            and generate business insights — no coding required.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button id="hero-cta-primary"
              onClick={() => navigate(isAuthenticated ? '/upload' : '/signup')}
              className="btn-primary text-base px-8 py-4">
              Start Analyzing Free <ArrowRight className="w-5 h-5" />
            </button>
            <button className="btn-secondary text-base px-8 py-4">
              Watch Demo
            </button>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-12 mt-16">
            {STATS.map(([v, l]) => (
              <div key={l} className="text-center">
                <div className="text-3xl font-black gradient-text-brand">{v}</div>
                <div className="text-sm text-slate-500 mt-1">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Grid ────────────────────────────────────────── */}
      <section className="px-8 py-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-white mb-3">Everything You Need</h2>
          <p className="text-center text-slate-500 mb-12">8 powerful modules working together</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="glass-card-hover p-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(99,102,241,0.15)' }}>
                  <Icon className="w-5 h-5" style={{ color: '#818cf8' }} />
                </div>
                <h3 className="text-white font-semibold mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Workflow ─────────────────────────────────────────────── */}
      <section className="px-8 py-20" style={{ background: 'rgba(15,23,42,0.5)' }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-white mb-3">How It Works</h2>
          <p className="text-center text-slate-500 mb-12">From raw data to insights in 6 steps</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {STEPS.map(({ n, title, desc }, i) => (
              <div key={n} className="text-center relative">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 text-lg font-black"
                  style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(139,92,246,0.2))', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>
                  {n}
                </div>
                <div className="text-white font-semibold text-sm mb-1">{title}</div>
                <div className="text-slate-500 text-xs">{desc}</div>
                {i < STEPS.length - 1 && (
                  <ArrowRight className="hidden lg:block absolute top-4 -right-2 w-4 h-4 text-slate-700" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Domains ──────────────────────────────────────────────── */}
      <section className="px-8 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-3">Domain-Specific Intelligence</h2>
          <p className="text-slate-500 mb-10">Specialized analysis for your industry</p>
          <div className="flex flex-wrap justify-center gap-3">
            {DOMAINS.map((d) => (
              <span key={d} className="px-5 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc' }}>
                {d}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="px-8 py-24">
        <div className="max-w-3xl mx-auto text-center">
          <div className="glass-card p-12 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10"
              style={{ background: 'radial-gradient(ellipse at center, #6366f1, transparent)' }} />
            <div className="relative z-10">
              <h2 className="text-4xl font-black text-white mb-4">
                Ready to <span className="gradient-text">Unlock Insights</span>?
              </h2>
              <p className="text-slate-400 mb-8">Upload your first dataset and experience AI-powered analytics.</p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <button id="cta-signup"
                  onClick={() => navigate(isAuthenticated ? '/upload' : '/signup')}
                  className="btn-primary text-lg px-10 py-4">
                  {isAuthenticated ? 'Go to App' : 'Start Now — It\'s Free'} <ArrowRight className="w-5 h-5" />
                </button>
                {!isAuthenticated && (
                  <button id="cta-login" onClick={() => navigate('/login')} className="btn-secondary text-base px-8 py-4">
                    Sign In
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="px-8 py-8 border-t" style={{ borderColor: 'rgba(99,102,241,0.1)' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="gradient-text font-bold">DataPilot AI</span>
          </div>
          <p className="text-slate-600 text-sm">
            Built with Node.js + FastAPI + React + Supabase · AI Analytics Platform
          </p>
          <div className="flex items-center gap-4">
            <a href="/login" className="text-slate-600 hover:text-slate-400 text-sm transition-colors">Sign In</a>
            <a href="/signup" className="text-slate-600 hover:text-slate-400 text-sm transition-colors">Sign Up</a>
            <a href="#" className="text-slate-600 hover:text-slate-400 text-sm transition-colors">
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
