import { useEffect, useState } from 'react'
import { useData } from '../context/DataContext'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import toast from 'react-hot-toast'
import { useTheme } from '../context/ThemeContext'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area,
} from 'recharts'
import {
  TrendingUp, TrendingDown, BarChart3, Loader2,
  AlertCircle, RefreshCw, UploadCloud, Maximize2,
  Activity, Database, Layers
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const COLORS = ['#6366f1','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899','#84cc16']

const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    background: 'rgba(10,15,30,0.95)',
    border: '1px solid rgba(99,102,241,0.3)',
    borderRadius: 12,
    fontSize: 12,
    color: '#e2e8f0',
  }
}

const AXIS_STYLE = { fontSize: 11, fill: '#64748b' }
const GRID_STYLE = { stroke: 'var(--border)', strokeDasharray: '4 4' }

// ── KPI Card ──────────────────────────────────────────────────────── //
function KPICard({ title, value, avg, trend_pct, trend_dir, description, index }) {
  const isUp = trend_dir === 'up'
  const trendColor = isUp ? '#10b981' : '#ef4444'

  // Dynamic aesthetic styling based on KPI type
  const lowerTitle = title.toLowerCase()
  let themeColor = 'rgba(99,102,241,0.3)' // Indigo default
  let glowColor = 'rgba(99,102,241,0.06)'
  let borderHover = 'rgba(99,102,241,0.5)'
  let topStrip = 'linear-gradient(90deg, #6366f1, #8b5cf6)'

  if (lowerTitle.includes('revenue') || lowerTitle.includes('profit') || lowerTitle.includes('sales') || lowerTitle.includes('income')) {
    // Finance/Sales - Emerald green themed
    themeColor = 'rgba(16,185,129,0.3)'
    glowColor = 'rgba(16,185,129,0.06)'
    borderHover = 'rgba(16,185,129,0.5)'
    topStrip = 'linear-gradient(90deg, #10b981, #34d399)'
  } else if (lowerTitle.includes('cost') || lowerTitle.includes('spend') || lowerTitle.includes('expense') || lowerTitle.includes('fatigue')) {
    // Cost/Negative - Rose themed
    themeColor = 'rgba(244,63,94,0.3)'
    glowColor = 'rgba(244,63,94,0.06)'
    borderHover = 'rgba(244,63,94,0.5)'
    topStrip = 'linear-gradient(90deg, #f43f5e, #fb7185)'
  } else if (lowerTitle.includes('customer') || lowerTitle.includes('user') || lowerTitle.includes('employee') || lowerTitle.includes('client') || lowerTitle.includes('cohort') || lowerTitle.includes('transaction')) {
    // People/Scaling - Ocean Blue/Cyan themed
    themeColor = 'rgba(6,182,212,0.3)'
    glowColor = 'rgba(6,182,212,0.06)'
    borderHover = 'rgba(6,182,212,0.5)'
    topStrip = 'linear-gradient(90deg, #06b6d4, #3b82f6)'
  } else if (lowerTitle.includes('sleep') || lowerTitle.includes('quality') || lowerTitle.includes('rating') || lowerTitle.includes('score')) {
    // Wellness/Ratings - Amber/Violet
    themeColor = 'rgba(245,158,11,0.3)'
    glowColor = 'rgba(245,158,11,0.06)'
    borderHover = 'rgba(245,158,11,0.5)'
    topStrip = 'linear-gradient(90deg, #f59e0b, #eab308)'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="kpi-card group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
      style={{
        border: '1px solid rgba(255,255,255,0.05)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
      }}
      whileHover={{
        borderColor: borderHover,
        boxShadow: `0 8px 30px ${glowColor.replace('0.06', '0.15')}`
      }}
    >
      {/* Top indicator stripe */}
      <div className="absolute top-0 left-0 right-0 h-[3px] z-20" style={{ background: topStrip }} />

      {/* Dynamic color-specific radial glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 0%, ${glowColor}, transparent 70%)` }} />

      <div className="relative z-10 flex flex-col h-full justify-between">
        <div>
          <div className="text-[10px] text-slate-500 mb-1.5 uppercase tracking-widest font-semibold truncate" title={title}>{title}</div>
          <div className="text-2xl font-black text-white tracking-tight mb-1 tabular-nums">{value}</div>
          {description && (
            <p className="text-[11px] text-slate-400 font-normal leading-relaxed mb-3 line-clamp-1 opacity-70 group-hover:opacity-100 transition-opacity duration-200">
              {description}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between mt-1 pt-2 border-t border-slate-800/40">
          <span className="text-[11px] text-slate-500 font-medium">avg {avg}</span>
          <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: `${trendColor}18`, color: trendColor }}>
            {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend_pct ?? 0).toFixed(1)}%
          </span>
        </div>
      </div>
    </motion.div>
  )
}

// ── Section header ────────────────────────────────────────────────── //
function SectionHeader({ icon: Icon, title, subtitle, color = 'var(--brand)' }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: color.startsWith('#') ? `${color}18` : `var(--border)` }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div>
        <h2 className="text-white font-semibold text-sm">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
    </div>
  )
}

// ── Chart Card wrapper ────────────────────────────────────────────── //
function ChartCard({ children, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-card p-5 ${className}`}
    >
      {children}
    </motion.div>
  )
}

// ── Custom Tooltip ────────────────────────────────────────────────── //
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="px-3 py-2 rounded-xl text-xs transition-all duration-300"
      style={{ background: 'var(--surface-800)', border: '1px solid var(--border)', color: '#e2e8f0' }}>
      {label && <p className="font-semibold mb-1 text-slate-300">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-slate-400">{p.name || p.dataKey}:</span>
          <span className="font-semibold" style={{ color: p.color || p.fill }}>
            {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Typewriter component ─────────────────────────────────────────── //
function Typewriter({ text = '', speed = 8 }) {
  const [displayedText, setDisplayedText] = useState('')
  useEffect(() => {
    let i = 0
    setDisplayedText('')
    const txt = text || ''
    if (!txt) return
    const interval = setInterval(() => {
      setDisplayedText((prev) => prev + txt.charAt(i))
      i++
      if (i >= txt.length) clearInterval(interval)
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed])
  return <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{displayedText}</p>
}

// ── Explanation Drawer ────────────────────────────────────────────── //
function ChartExplanationDrawer({ chart, clickedPoint, explanation, loading, onClose, domain }) {
  // Compute chart statistics
  let stats = null
  if (chart?.data) {
    // Find numeric key
    const first = chart.data[0] || {}
    let valKey = 'value'
    for (const k of Object.keys(first)) {
      if (k !== 'name' && k !== 'x' && typeof first[k] === 'number') {
        valKey = k
        break
      }
    }
    const vals = chart.data.map(d => Number(d[valKey] ?? d.value ?? d.y ?? 0)).filter(v => !isNaN(v))
    if (vals.length > 0) {
      const max = Math.max(...vals)
      const min = Math.min(...vals)
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length
      stats = { max, min, avg }
    }
  }

  const fmt = (num) => {
    if (!num && num !== 0) return '0.00'
    if (num >= 1_000_000) return `${(num/1_000_000).toFixed(2)}M`
    if (num >= 1_000) return num.toLocaleString(undefined, { maximumFractionDigits: 2 })
    return num.toFixed(2)
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
        className="fixed right-0 top-0 h-full w-[440px] max-w-full z-50 glass-card border-l border-white/10 flex flex-col shadow-2xl bg-slate-950/95 p-6 overflow-y-auto"
        style={{
          boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
          background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(8,12,30,0.98))'
        }}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/60 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-indigo-500/10 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <Activity className="w-5 h-5 text-indigo-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm tracking-wide">DataPilot AI Analyst</h3>
              <p className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase">Chart Explanation</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800/40">
            ✕
          </button>
        </div>

        <div className="mb-6 p-4 rounded-2xl bg-slate-900/60 border border-white/5">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block mb-1">Analyzing Chart</span>
          <h4 className="text-white font-bold text-sm mb-2">{chart?.title}</h4>
          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' }}>
            Domain: {domain?.toUpperCase() || 'GENERIC'}
          </span>
        </div>

        {clickedPoint && (
          <div className="mb-6 p-3 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Selected Coordinate</span>
              <span className="text-white text-xs font-semibold">{clickedPoint.name}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Value</span>
              <span className="text-indigo-400 text-xs font-black">{fmt(clickedPoint.value)}</span>
            </div>
          </div>
        )}

        <div className="flex-1 mb-6 flex flex-col justify-start">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-2">Executive AI Explanation</span>
          
          <div className="p-5 rounded-2xl border border-white/10 flex-1 relative overflow-hidden bg-slate-900/40"
               style={{ minHeight: 160 }}>
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 to-violet-500 opacity-60" />

            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-10">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                <span className="text-xs text-slate-500 font-medium">DataPilot is analyzing trend variances...</span>
              </div>
            ) : (
              <Typewriter text={explanation} />
            )}
          </div>
        </div>

        {stats && (
          <div className="mt-auto border-t border-slate-800/60 pt-4">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block mb-3">Series Baseline Metrics</span>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Series Peak', val: stats.max, color: '#10b981' },
                { label: 'Floor Value', val: stats.min, color: '#ef4444' },
                { label: 'Average Mean', val: stats.avg, color: '#a5b4fc' },
              ].map(({ label, val, color }) => (
                <div key={label} className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 text-center">
                  <span className="text-[9px] text-slate-500 font-medium uppercase tracking-wider block mb-1">{label}</span>
                  <span className="text-xs font-black tabular-nums" style={{ color }}>{fmt(val)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </motion.div>
    </>
  )
}

export default function DashboardPage() {
  const { dashboard, sessionId, loading, runDashboard, filename, domain } = useData()
  const { theme, preset } = useTheme()
  const COLORS = preset.chartColors
  const navigate = useNavigate()

  // AI Explanation State
  const [explainingChart, setExplainingChart] = useState(null)
  const [clickedPoint, setClickedPoint] = useState(null)
  const [explanation, setExplanation] = useState('')
  const [loadingExplanation, setLoadingExplanation] = useState(false)

  const handleExplainChart = async (chart, point = null) => {
    setExplainingChart(chart)
    setClickedPoint(point)
    setExplanation('')
    setLoadingExplanation(true)
    try {
      const { data } = await api.explainChart({
        session_id: sessionId,
        chart_title: chart.title,
        chart_type: chart.type || 'line',
        series_data: chart.data || [],
        clicked_point: point,
        domain: domain,
      })
      setExplanation(data.explanation)
    } catch (err) {
      console.error(err)
      toast.error('AI Explanation failed: ' + err.message)
      setExplanation('Failed to generate chart analysis. Please verify your connection or re-upload your dataset.')
    } finally {
      setLoadingExplanation(false)
    }
  }

  useEffect(() => {
    if (sessionId && !dashboard) runDashboard()
  }, [sessionId])

  // ── Empty / Loading states ──────────────────────────────────────── //
  if (!filename) return (
    <div className="flex flex-col items-center justify-center h-full gap-5 text-center py-20">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(99,102,241,0.1)' }}>
        <UploadCloud size={32} className="text-indigo-400" />
      </div>
      <div>
        <p className="text-white font-semibold text-lg mb-1">No Dataset Loaded</p>
        <p className="text-slate-500 text-sm">Upload a dataset to generate your dashboard</p>
      </div>
      <button onClick={() => navigate('/upload')} className="btn-primary px-6 py-3">
        <UploadCloud size={16} /> Upload Dataset
      </button>
    </div>
  )

  if (loading.dashboard) return (
    <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
      <div className="relative">
        <div className="w-16 h-16 rounded-full" style={{ background: 'rgba(99,102,241,0.1)' }} />
        <Loader2 size={32} className="absolute inset-0 m-auto text-indigo-400 animate-spin" />
      </div>
      <div className="text-center">
        <p className="text-white font-semibold mb-1">Generating Dashboard</p>
        <p className="text-slate-500 text-sm">Analysing your data and building charts…</p>
      </div>
    </div>
  )

  if (!dashboard) return (
    <div className="flex flex-col items-center justify-center h-full gap-5 py-20">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(99,102,241,0.1)' }}>
        <BarChart3 size={32} className="text-indigo-400" />
      </div>
      <div className="text-center">
        <p className="text-white font-semibold text-lg mb-1">Dashboard Not Generated</p>
        <p className="text-slate-500 text-sm">Click below to generate your analytics dashboard</p>
      </div>
      <button onClick={runDashboard} className="btn-primary px-8 py-3">
        <RefreshCw size={16} /> Generate Dashboard
      </button>
    </div>
  )

  const {
    kpi_cards = [], line_charts = [], bar_charts = [],
    pie_charts = [], heatmap = {}, scatter_pairs = []
  } = dashboard

  const totalCharts = line_charts.length + bar_charts.length + pie_charts.length + scatter_pairs.length

  return (
    <div className="space-y-8">

      {/* ── Top summary bar ──────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          {[
            { icon: Database,  label: `${kpi_cards.length} KPIs` },
            { icon: BarChart3, label: `${totalCharts} Charts` },
            { icon: Layers,    label: scatter_pairs.length > 0 ? `${scatter_pairs.length} Scatter plots` : 'Heatmap included' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-xs text-slate-500 px-3 py-1.5 rounded-lg transition-all duration-300"
              style={{ background: 'var(--border)', border: '1px solid var(--border)' }}>
              <Icon size={12} style={{ color: 'var(--brand)' }} />
              {label}
            </div>
          ))}
        </div>
        <button onClick={runDashboard} className="btn-secondary text-xs py-2 px-3 gap-1.5">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────── */}
      {kpi_cards.length > 0 && (
        <section>
          <SectionHeader icon={Activity} title="Key Performance Indicators"
            subtitle={`${kpi_cards.length} metrics from your dataset`} color="#818cf8" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {kpi_cards.slice(0, 10).map((kpi, i) => (
              <KPICard key={i} {...kpi} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* ── Line / Area Charts ───────────────────────────────────── */}
      {line_charts.length > 0 && (
        <section>
          <SectionHeader icon={TrendingUp} title="Trend Analysis"
            subtitle="Time-series and sequential patterns" color="#10b981" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {line_charts.map((chart, i) => (
              <ChartCard key={i}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold text-sm">{chart.title}</h3>
                  <button
                    onClick={() => handleExplainChart({ ...chart, type: 'line' })}
                    className="flex items-center gap-1.5 text-[10px] font-semibold hover:text-white px-2.5 py-1 rounded-lg border transition-all duration-300 shadow-sm"
                    style={{
                      color: 'var(--brand)',
                      background: 'rgba(255,255,255,0.02)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <Activity className="w-3 h-3 animate-pulse" style={{ color: 'var(--brand)' }} />
                    AI Explain
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart
                    data={chart.data}
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      if (e && e.activePayload && e.activePayload.length > 0) {
                        const clickedData = e.activePayload[0].payload
                        const label = e.activeLabel
                        const valKey = e.activePayload[0].dataKey || 'value'
                        const val = clickedData[valKey]
                        handleExplainChart({ ...chart, type: 'line' }, { name: label, value: val, [valKey]: val })
                      }
                    }}
                  >
                    <defs>
                      {(chart.series || []).map((s, j) => (
                        <linearGradient key={s.key} id={`grad-${i}-${j}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS[j % COLORS.length]} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={COLORS[j % COLORS.length]} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid {...GRID_STYLE} />
                    <XAxis dataKey={chart.x_key} tick={AXIS_STYLE} />
                    <YAxis tick={AXIS_STYLE} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
                    {(chart.series || []).map((s, j) => (
                      <Area key={s.key} type="monotone" dataKey={s.key} name={s.label}
                        stroke={COLORS[j % COLORS.length]} strokeWidth={2}
                        fill={`url(#grad-${i}-${j})`} dot={false} />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>
            ))}
          </div>
        </section>
      )}

      {/* ── Bar + Pie side by side ───────────────────────────────── */}
      {(bar_charts.length > 0 || pie_charts.length > 0) && (
        <section>
          <SectionHeader icon={BarChart3} title="Distribution & Composition"
            subtitle="Categorical breakdowns and proportions" color="#f59e0b" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {bar_charts.slice(0, 2).map((chart, i) => (
              <ChartCard key={i}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold text-sm">{chart.title}</h3>
                  <button
                    onClick={() => handleExplainChart({ ...chart, type: 'bar' })}
                    className="flex items-center gap-1.5 text-[10px] font-semibold hover:text-white px-2.5 py-1 rounded-lg border transition-all duration-300 shadow-sm"
                    style={{
                      color: 'var(--brand)',
                      background: 'rgba(255,255,255,0.02)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <Activity className="w-3 h-3 animate-pulse" style={{ color: 'var(--brand)' }} />
                    AI Explain
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={chart.data}
                    layout="vertical"
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      if (e && e.activePayload && e.activePayload.length > 0) {
                        const clickedData = e.activePayload[0].payload
                        const label = clickedData[chart.x_key] || e.activeLabel
                        const val = clickedData.value
                        handleExplainChart({ ...chart, type: 'bar' }, { name: label, value: val })
                      }
                    }}
                  >
                    <CartesianGrid {...GRID_STYLE} />
                    <XAxis type="number" tick={AXIS_STYLE} />
                    <YAxis dataKey={chart.x_key} type="category" width={100} tick={AXIS_STYLE} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {(chart.data || []).map((_, j) => (
                        <Cell key={j} fill={COLORS[j % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            ))}

            {pie_charts.slice(0, 2).map((chart, i) => (
              <ChartCard key={i}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold text-sm">{chart.title}</h3>
                  <button
                    onClick={() => handleExplainChart({ ...chart, type: 'pie' })}
                    className="flex items-center gap-1.5 text-[10px] font-semibold hover:text-white px-2.5 py-1 rounded-lg border transition-all duration-300 shadow-sm"
                    style={{
                      color: 'var(--brand)',
                      background: 'rgba(255,255,255,0.02)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <Activity className="w-3 h-3 animate-pulse" style={{ color: 'var(--brand)' }} />
                    AI Explain
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={chart.data} dataKey="value" nameKey="name"
                      cx="50%" cy="50%" outerRadius={90} innerRadius={40}
                      paddingAngle={3}
                      style={{ cursor: 'pointer' }}
                      onClick={(dataPoint) => {
                        if (dataPoint) {
                          handleExplainChart({ ...chart, type: 'pie' }, { name: dataPoint.name, value: dataPoint.value })
                        }
                      }}
                    >
                      {(chart.data || []).map((_, j) => (
                        <Cell key={j} fill={COLORS[j % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: 11, color: '#64748b' }}
                      formatter={(value) => <span style={{ color: '#94a3b8' }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            ))}
          </div>
        </section>
      )}

      {/* ── Correlation Heatmap ──────────────────────────────────── */}
      {heatmap?.columns?.length > 0 && (
        <section>
          <SectionHeader icon={Layers} title="Correlation Heatmap"
            subtitle="Feature relationships — blue = positive, red = negative" color="#06b6d4" />
          <ChartCard>
            <div className="overflow-x-auto">
              <div style={{ minWidth: heatmap.columns.length * 56 + 100 }}>
                {/* Header row */}
                <div style={{ display: 'grid', gridTemplateColumns: `100px repeat(${heatmap.columns.length}, 1fr)`, gap: 3, marginBottom: 3 }}>
                  <div />
                  {heatmap.columns.map(col => (
                    <div key={col} className="text-center text-xs text-slate-500 font-medium truncate px-1"
                      style={{ maxWidth: 56 }} title={col}>{col}</div>
                  ))}
                </div>

                {/* Data rows */}
                {heatmap.columns.map(rowCol => (
                  <div key={rowCol} style={{ display: 'grid', gridTemplateColumns: `100px repeat(${heatmap.columns.length}, 1fr)`, gap: 3, marginBottom: 3 }}>
                    <div className="text-xs text-slate-500 flex items-center font-medium truncate pr-2"
                      style={{ maxWidth: 100 }} title={rowCol}>{rowCol}</div>
                    {heatmap.columns.map(colCol => {
                      const cell = heatmap.data?.find(d => d.x === colCol && d.y === rowCol)
                      const val = cell?.value ?? 0
                      const intensity = Math.abs(val)
                      const isPos = val >= 0
                      const bg = isPos
                        ? `rgba(99,102,241,${(intensity * 0.9).toFixed(2)})`
                        : `rgba(239,68,68,${(intensity * 0.9).toFixed(2)})`
                      return (
                        <div key={colCol} title={`${rowCol} ↔ ${colCol}: ${val.toFixed(3)}`}
                          className="rounded-lg flex items-center justify-center transition-transform hover:scale-110 cursor-default"
                          style={{ background: bg, height: 44, fontSize: 9, fontWeight: 600,
                            color: intensity > 0.4 ? '#fff' : '#475569', border: '1px solid rgba(255,255,255,0.04)' }}>
                          {val.toFixed(2)}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        </section>
      )}

      {/* ── Scatter Plots ────────────────────────────────────────── */}
      {scatter_pairs.length > 0 && (
        <section>
          <SectionHeader icon={Activity} title="Scatter Analysis"
            subtitle="Pairwise feature correlations" color="#ec4899" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {scatter_pairs.map((chart, i) => (
              <ChartCard key={i}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-white font-semibold text-sm">{chart.title}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium inline-block mt-1 transition-all duration-300"
                      style={{ background: 'var(--border)', color: 'var(--brand)', border: '1px solid var(--border)' }}>
                      r = {chart.correlation}
                    </span>
                  </div>
                  <button
                    onClick={() => handleExplainChart({ ...chart, type: 'scatter' })}
                    className="flex items-center gap-1.5 text-[10px] font-semibold hover:text-white px-2.5 py-1 rounded-lg border transition-all duration-300 shadow-sm"
                    style={{
                      color: 'var(--brand)',
                      background: 'rgba(255,255,255,0.02)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <Activity className="w-3 h-3 animate-pulse" style={{ color: 'var(--brand)' }} />
                    AI Explain
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <ScatterChart
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      if (e && e.activePayload && e.activePayload.length > 0) {
                        const clickedData = e.activePayload[0].payload
                        handleExplainChart({ ...chart, type: 'scatter' }, { name: `Point (${clickedData.x}, ${clickedData.y})`, value: clickedData.y, x: clickedData.x, y: clickedData.y })
                      }
                    }}
                  >
                    <CartesianGrid {...GRID_STYLE} />
                    <XAxis dataKey="x" name={chart.x_key} tick={AXIS_STYLE} />
                    <YAxis dataKey="y" name={chart.y_key} tick={AXIS_STYLE} />
                    <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter data={chart.data} fill={COLORS[i % COLORS.length]} fillOpacity={0.7} />
                  </ScatterChart>
                </ResponsiveContainer>
              </ChartCard>
            ))}
          </div>
        </section>
      )}

      {/* ── Empty charts fallback ────────────────────────────────── */}
      {totalCharts === 0 && kpi_cards.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <AlertCircle size={32} className="text-slate-600" />
          <p className="text-slate-500">No charts could be generated for this dataset.</p>
          <p className="text-slate-600 text-sm">Try uploading a dataset with numeric columns.</p>
        </div>
      )}

      <AnimatePresence>
        {explainingChart && (
          <ChartExplanationDrawer
            chart={explainingChart}
            clickedPoint={clickedPoint}
            explanation={explanation}
            loading={loadingExplanation}
            domain={domain}
            onClose={() => setExplainingChart(null)}
          />
        )}
      </AnimatePresence>

    </div>
  )
}
