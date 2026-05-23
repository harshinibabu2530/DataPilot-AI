import { useEffect } from 'react'
import { useData } from '../context/DataContext'
import { useNavigate } from 'react-router-dom'
import { Lightbulb, Loader2, AlertCircle, RefreshCw, TrendingUp, AlertTriangle, Link2, Star, Info, Brain, Sparkles } from 'lucide-react'

const TYPE_ICONS = {
  trend:          { icon: TrendingUp,    color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
  anomaly:        { icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  correlation:    { icon: Link2,         color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  recommendation: { icon: Star,          color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  summary:        { icon: Info,          color: '#06b6d4', bg: 'rgba(6,182,212,0.1)'  },
}

const PRIORITY_STYLES = {
  high:   'badge-danger',
  medium: 'badge-warning',
  low:    'badge-success',
}

function InsightCard({ insight, index }) {
  const { type = 'summary', title, description, priority = 'medium' } = insight
  const { icon: Icon, color, bg } = TYPE_ICONS[type] || TYPE_ICONS.summary

  return (
    <div className="insight-card animate-fade-in" style={{ animationDelay: `${index * 80}ms` }}>
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h3 className="text-white font-semibold text-sm">{title}</h3>
            <span className={`badge ${PRIORITY_STYLES[priority]}`}>{priority}</span>
            <span className="badge badge-violet">{type}</span>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  )
}

function RecommendationCard({ rec, index }) {
  const { title, description, metric, action, impact = 'medium' } = rec

  const styles = {
    high: {
      border: '1px solid rgba(239, 68, 68, 0.35)',
      glow: 'shadow-[0_0_20px_rgba(239,68,68,0.15)]',
      borderLeft: '4px solid #ef4444',
      badge: 'bg-red-500/20 text-red-400 border border-red-500/30',
      metricBg: 'rgba(239, 68, 68, 0.1)',
      metricText: '#fca5a5'
    },
    medium: {
      border: '1px solid rgba(245, 158, 11, 0.35)',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]',
      borderLeft: '4px solid #f59e0b',
      badge: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
      metricBg: 'rgba(245, 158, 11, 0.1)',
      metricText: '#fcd34d'
    },
    low: {
      border: '1px solid rgba(16, 185, 129, 0.35)',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]',
      borderLeft: '4px solid #10b981',
      badge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      metricBg: 'rgba(16, 185, 129, 0.1)',
      metricText: '#6ee7b7'
    }
  }

  const currentStyle = styles[impact.toLowerCase()] || styles.medium

  return (
    <div 
      className={`glass-card p-6 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:brightness-110 flex flex-col justify-between ${currentStyle.glow} animate-fade-in`}
      style={{ 
        border: currentStyle.border,
        borderLeft: currentStyle.borderLeft,
        background: 'rgba(15, 23, 42, 0.85)',
        animationDelay: `${index * 100}ms`
      }}
    >
      <div>
        <div className="flex justify-between items-start gap-4 mb-3">
          <h4 className="text-white font-bold text-sm tracking-tight leading-snug">{title}</h4>
          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full shrink-0 ${currentStyle.badge}`}>
            {impact} Impact
          </span>
        </div>
        
        <p className="text-slate-400 text-xs leading-relaxed mb-4">{description}</p>
      </div>

      <div className="mt-auto space-y-4">
        {/* Metric highlight badge */}
        {metric && (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold" style={{ background: currentStyle.metricBg }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: currentStyle.metricText }} />
            <span style={{ color: currentStyle.metricText }}>{metric}</span>
          </div>
        )}

        {/* Tactical Recommendation Action Box */}
        {action && (
          <div className="p-3.5 rounded-xl border border-slate-800/60 bg-slate-900/40 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500/50" />
            <h5 className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mb-1">Tactical Action</h5>
            <p className="text-slate-300 text-xs leading-relaxed font-medium">{action}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function InsightsPage() {
  const { insights, sessionId, loading, runInsights, filename, domainResults, eda } = useData()
  const navigate = useNavigate()

  useEffect(() => {
    if (sessionId && (!insights || insights.length === 0)) runInsights()
  }, [sessionId])

  if (!filename) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <AlertCircle className="w-12 h-12 text-slate-600" />
      <p className="text-slate-500">No dataset loaded. <button onClick={() => navigate('/upload')} className="text-brand-400 hover:underline">Upload first</button></p>
    </div>
  )

  if (loading.insights) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="relative">
        <Loader2 className="w-10 h-10 text-brand-400 animate-spin" />
        <Lightbulb className="w-4 h-4 text-violet-400 absolute -top-1 -right-1" />
      </div>
      <p className="text-slate-400">AI generating insights...</p>
    </div>
  )

  const narrativeInsight = insights?.find(i => i.type === 'narrative')
  const narrativeText = narrativeInsight?.description
  const filteredInsights = insights?.filter(i => i.type !== 'narrative') || []

  const high   = filteredInsights.filter(i => i.priority === 'high')
  const medium = filteredInsights.filter(i => i.priority === 'medium')
  const low    = filteredInsights.filter(i => i.priority === 'low')

  // Get recommendations from eda results (structured list)
  let recsList = []
  if (eda?.overview?.recommendations && Array.isArray(eda.overview.recommendations)) {
    recsList = eda.overview.recommendations
  } else if (domainResults?.recommendations && Array.isArray(domainResults.recommendations)) {
    // Fallback if they are simple strings
    recsList = domainResults.recommendations.filter(Boolean).map((str, idx) => ({
      title: `Strategic Focus Segment #${idx + 1}`,
      description: str,
      metric: 'KPI Core Objective',
      action: 'Optimize resource allocation and customer relationship parameters.',
      impact: idx === 0 ? 'high' : idx === 1 ? 'medium' : 'low'
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500 text-sm">{filteredInsights.length} insights generated</p>
        </div>
        <button onClick={runInsights} disabled={loading.insights} className="btn-secondary text-sm py-2 px-4">
          <RefreshCw className="w-3.5 h-3.5" /> Regenerate
        </button>
      </div>

      {/* Executive Storytelling Summary */}
      {narrativeText && (
        <div className="glass-card p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1"
            style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #10b981)' }} />
          
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <Brain className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Executive AI Storytelling Narrative</h2>
              <p className="text-xs text-slate-500 font-medium">Detailed Analytics Journey & Outcomes</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-300 text-sm leading-relaxed">
            {narrativeText.split('\n\n').slice(0, 3).map((para, idx) => {
              const headers = [
                "📋 Phase 1: Ingestion & Cleaning",
                "🔍 Phase 2: Core Analytics & KPIs",
                "💡 Phase 3: Strategic Horizons"
              ];
              return (
                <div key={idx} className="space-y-2 p-4 rounded-xl animate-fade-in"
                  style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)', animationDelay: `${idx * 100}ms` }}>
                  <h4 className="text-indigo-400 font-bold text-xs uppercase tracking-wider">
                    {headers[idx] || "Business Outline"}
                  </h4>
                  <p className="text-slate-400 text-xs leading-relaxed mt-1">{para}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Strategic Action Hub */}
      {recsList.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-500/10 border border-indigo-500/25">
              <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base leading-tight">Strategic Action Hub</h2>
              <p className="text-xs text-slate-500 font-medium">Empirical Business Actions & Yield Levers</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recsList.map((rec, i) => (
              <RecommendationCard key={i} rec={rec} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Domain KPIs */}
      {domainResults?.kpis && Object.keys(domainResults.kpis).length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-white font-semibold mb-4">Domain KPIs — {domainResults.domain?.toUpperCase()}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(domainResults.kpis).slice(0, 8).map(([key, val]) => (
              <div key={key} className="p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.12)' }}>
                <div className="text-xs text-slate-500 mb-1">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                <div className="text-lg font-bold text-white">
                  {typeof val === 'number' ? val.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(val ?? '—')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Priority groups */}
      {high.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <h3 className="text-white font-semibold text-sm">High Priority</h3>
            <span className="badge badge-danger">{high.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {high.map((ins, i) => <InsightCard key={i} insight={ins} index={i} />)}
          </div>
        </div>
      )}

      {medium.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <h3 className="text-white font-semibold text-sm">Medium Priority</h3>
            <span className="badge badge-warning">{medium.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {medium.map((ins, i) => <InsightCard key={i} insight={ins} index={i} />)}
          </div>
        </div>
      )}

      {low.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <h3 className="text-white font-semibold text-sm">Low Priority</h3>
            <span className="badge badge-success">{low.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {low.map((ins, i) => <InsightCard key={i} insight={ins} index={i} />)}
          </div>
        </div>
      )}

      {insights.length === 0 && !loading.insights && (
        <div className="text-center py-16">
          <Lightbulb className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-500 mb-4">No insights generated yet</p>
          <button onClick={runInsights} className="btn-primary">Generate Insights</button>
        </div>
      )}
    </div>
  )
}
