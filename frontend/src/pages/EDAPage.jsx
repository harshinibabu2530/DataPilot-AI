import { useEffect, useState } from 'react'
import { useData } from '../context/DataContext'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { BarChart3, Loader2, AlertCircle, RefreshCw, TrendingUp, TrendingDown, Minus, Brain, Award } from 'lucide-react'
import toast from 'react-hot-toast'

function SkewBadge({ val }) {
  const abs = Math.abs(val)
  if (abs < 0.5) return <span className="badge badge-success">Symmetric</span>
  if (abs < 1) return <span className="badge badge-warning">{val > 0 ? 'R-Skewed' : 'L-Skewed'}</span>
  return <span className="badge badge-danger">{val > 0 ? 'Heavy R-Skew' : 'Heavy L-Skew'}</span>
}

export default function EDAPage() {
  const { eda, sessionId, loading, runEDA, filename, rowCount, columnCount, uploadFile } = useData()
  const navigate = useNavigate()
  const [attempted, setAttempted] = useState(false)
  const [restoring, setRestoring] = useState(false)

  useEffect(() => {
    const hasFullEda = eda && eda.statistical_summary && eda.statistical_summary.length > 0;
    if (sessionId && (!eda || !hasFullEda) && !loading.eda && !attempted) {
      setAttempted(true)
      runEDA()
    }
  }, [sessionId, eda, loading.eda, attempted])

  if (!filename) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <AlertCircle className="w-12 h-12 text-slate-600" />
      <p className="text-slate-500">No dataset loaded. <button onClick={() => navigate('/upload')} className="text-brand-400 hover:underline">Upload first</button></p>
    </div>
  )

  if (loading.eda && (!eda || !eda.statistical_summary || eda.statistical_summary.length === 0)) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <Loader2 className="w-10 h-10 text-brand-400 animate-spin" />
      <p className="text-slate-400">Running EDA...</p>
    </div>
  )

  if (!eda) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <button onClick={runEDA} className="btn-primary"><RefreshCw className="w-4 h-4" /> Run EDA</button>
    </div>
  )

  const { overview = {}, statistical_summary = [], missing_values = [], correlation = {}, distributions = {}, categorical_summaries = {}, top_correlations = [] } = eda

  // Safe dynamic fallback logic for legacy datasets
  const isNumeric = (dtype) => {
    if (!dtype) return false
    const d = dtype.toLowerCase()
    return d.includes('int') || d.includes('float') || d.includes('num')
  }

  const displayRows = overview.rows ?? rowCount
  const displayColumns = overview.columns ?? columnCount ?? missing_values.length
  const displayNumeric = overview.numeric_columns?.length ?? missing_values.filter(m => isNumeric(m.dtype)).length
  const displayMissing = overview.total_missing ?? missing_values.reduce((acc, m) => acc + (m.missing_count || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            Exploratory Data Analysis
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Statistical summaries, feature correlations, and data distributions for <span className="text-slate-300 font-medium">{filename}</span>
          </p>
        </div>
        <button 
          onClick={runEDA} 
          disabled={loading.eda}
          className="btn-secondary self-start sm:self-center flex items-center gap-1.5 text-xs py-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading.eda ? 'animate-spin' : ''}`} />
          {loading.eda ? 'Running Analysis...' : 'Recalculate EDA'}
        </button>
      </div>

      {/* Partial data warning & Restore Full Analytics Uploader */}
      {(!statistical_summary || statistical_summary.length === 0) && (
        <div className="glass-card p-6 border border-amber-500/20 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900/90 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                <h4 className="text-amber-400 font-semibold text-base">Restore Full Analytics</h4>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                This legacy dataset was analyzed before recent system updates and is missing its source file in storage. Click or drag the original file <span className="text-indigo-300 font-medium font-mono">({filename})</span> below to upload it and restore beautiful statistical charts, correlation matrix, and value distributions.
              </p>
            </div>

            <div className="w-full md:w-80 shrink-0">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700/50 hover:border-indigo-500/40 rounded-xl p-5 cursor-pointer bg-slate-950/40 hover:bg-slate-950/70 transition-all duration-200 group text-center">
                {restoring ? (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
                    <p className="text-xs text-indigo-300 font-medium animate-pulse">Running full EDA pipeline...</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="mx-auto w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                      <RefreshCw className="w-4 h-4 animate-spin-slow" />
                    </div>
                    <div className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors">Upload original CSV</div>
                    <div className="text-[10px] text-slate-500 font-mono truncate max-w-[220px] mx-auto">{filename}</div>
                  </div>
                )}
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  disabled={restoring}
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setRestoring(true)
                    const toastId = toast.loading('Uploading file and restoring session...')
                    try {
                      await uploadFile(file, sessionId)
                      toast.loading('Regenerating complete EDA statistics...', { id: toastId })
                      await runEDA()
                      toast.success('🎉 Analytics successfully restored!', { id: toastId })
                    } catch (err) {
                      toast.error(`Restoration failed: ${err.message}`, { id: toastId })
                    } finally {
                      setRestoring(false)
                    }
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Rows', value: displayRows ? displayRows.toLocaleString() : null },
          { label: 'Columns', value: displayColumns },
          { label: 'Numeric', value: displayNumeric },
          { label: 'Missing', value: displayMissing ? displayMissing.toLocaleString() : '0' },
        ].map(({ label, value }) => (
          <div key={label} className="kpi-card">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">{label}</div>
            <div className="text-2xl font-bold text-white">{value ?? '—'}</div>
          </div>
        ))}
      </div>

      {/* AI Data Quality Dashboard */}
      {eda?.data_quality && (
        <div className="glass-card p-6 border border-slate-700/40 relative overflow-hidden bg-gradient-to-br from-slate-900/80 via-slate-950/80 to-slate-900/60 shadow-xl backdrop-blur-md">
          {/* Subtle glowing elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-400" />
            AI Data Quality Score
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            {/* Circular Gauge */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-950/20 rounded-2xl border border-slate-800/40">
              <div className="relative w-32 h-32 flex items-center justify-center">
                {/* SVG Radial Gauge */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background Track */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="rgba(255,255,255,0.03)"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  {/* Glowing Score Arc */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke={
                      eda.data_quality.overall_score >= 85 ? "#10b981" : 
                      eda.data_quality.overall_score >= 70 ? "#f59e0b" : "#ef4444"
                    }
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - (251.2 * eda.data_quality.overall_score) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                    style={{
                      filter: `drop-shadow(0 0 6px ${
                        eda.data_quality.overall_score >= 85 ? "rgba(16,185,129,0.4)" : 
                        eda.data_quality.overall_score >= 70 ? "rgba(245,158,11,0.4)" : "rgba(239,68,68,0.4)"
                      })`
                    }}
                  />
                </svg>
                {/* Inner Text */}
                <div className="absolute text-center">
                  <div className="text-2xl font-extrabold text-white tracking-tight">
                    {Math.round(eda.data_quality.overall_score)}%
                  </div>
                  <div className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">
                    Overall Health
                  </div>
                </div>
              </div>
            </div>
            
            {/* Metric Breakdowns */}
            <div className="space-y-4 lg:col-span-2">
              {[
                { 
                  label: 'Missing Values', 
                  score: eda.data_quality.missing_values_score,
                  color: eda.data_quality.missing_values_score >= 85 ? 'from-emerald-500 to-emerald-400' : eda.data_quality.missing_values_score >= 70 ? 'from-amber-500 to-amber-400' : 'from-red-500 to-red-400'
                },
                { 
                  label: 'Consistency', 
                  score: eda.data_quality.consistency_score,
                  color: eda.data_quality.consistency_score >= 85 ? 'from-emerald-500 to-emerald-400' : eda.data_quality.consistency_score >= 70 ? 'from-amber-500 to-amber-400' : 'from-red-500 to-red-400'
                },
                { 
                  label: 'Outliers', 
                  score: eda.data_quality.outliers_score,
                  color: eda.data_quality.outliers_score >= 85 ? 'from-emerald-500 to-emerald-400' : eda.data_quality.outliers_score >= 70 ? 'from-amber-500 to-amber-400' : 'from-red-500 to-red-400'
                },
              ].map(({ label, score, color }) => (
                <div key={label} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-medium">{label}</span>
                    <span className="font-mono text-white font-bold">{Math.round(score)}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-950/60 overflow-hidden border border-slate-800/40">
                    <div 
                      className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-1000 ease-out`} 
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* AI Governance Briefing Box */}
          {eda.data_quality.explanation && (
            <div className="mt-6 p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 flex items-start gap-3 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0 shadow-inner">
                <Brain className="w-5 h-5 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">AI Governance Briefing</div>
                <p className="text-slate-300 text-sm leading-relaxed italic font-serif">
                  “{eda.data_quality.explanation}”
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Statistical Summary */}
      {statistical_summary.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-brand-400" /> Statistical Summary
          </h3>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  {['Column','Count','Mean','Std','Min','Median','Max','Skewness'].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {statistical_summary.map((row) => (
                  <tr key={row.column}>
                    <td className="font-medium text-slate-200">{row.column}</td>
                    <td>{row.count?.toLocaleString()}</td>
                    <td className="font-mono text-xs">{row.mean}</td>
                    <td className="font-mono text-xs">{row.std}</td>
                    <td className="font-mono text-xs">{row.min}</td>
                    <td className="font-mono text-xs">{row.median}</td>
                    <td className="font-mono text-xs">{row.max}</td>
                    <td><SkewBadge val={row.skewness} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Missing Values */}
      <div className="glass-card p-6">
        <h3 className="text-white font-semibold mb-4">Missing Values Report</h3>
        <div className="space-y-3">
          {missing_values.slice(0, 12).map((item) => (
            <div key={item.column} className="flex items-center gap-4">
              <span className="text-sm text-slate-300 w-40 shrink-0 truncate">{item.column}</span>
              <div className="flex-1 progress-bar">
                <div className="progress-fill" style={{
                  width: `${item.missing_pct}%`,
                  background: item.missing_pct > 30 ? 'linear-gradient(90deg,#ef4444,#dc2626)'
                    : item.missing_pct > 10 ? 'linear-gradient(90deg,#f59e0b,#d97706)'
                    : 'linear-gradient(90deg,#6366f1,#8b5cf6)'
                }} />
              </div>
              <span className="text-sm font-mono text-slate-400 w-16 text-right shrink-0">
                {item.missing_pct.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-600 w-16 shrink-0">{item.dtype}</span>
            </div>
          ))}
          {missing_values.every(m => m.missing_pct === 0) && (
            <p className="text-emerald-400 text-sm flex items-center gap-2">
              ✓ No missing values detected
            </p>
          )}
        </div>
      </div>

      {/* Distributions */}
      {Object.keys(distributions).length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-white font-semibold mb-4">Value Distributions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(distributions).slice(0, 6).map(([col, dist]) => {
              const chartData = dist.bin_edges.slice(0, -1).map((edge, i) => ({
                bin: edge.toFixed(1),
                count: dist.counts[i],
              }))
              return (
                <div key={col}>
                  <div className="text-sm text-slate-400 mb-2 font-medium">{col}</div>
                  <div className="text-xs text-slate-600 mb-2">μ={dist.mean} σ={dist.std}</div>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={chartData} barCategoryGap="2%">
                      <XAxis dataKey="bin" tick={false} />
                      <YAxis tick={false} />
                      <Tooltip
                        contentStyle={{ background: '#0f172a', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, fontSize: 11 }}
                        formatter={(v) => [v, 'count']}
                      />
                      <Bar dataKey="count" fill="#6366f1" fillOpacity={0.8} radius={[2,2,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Top Correlations */}
      {top_correlations.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-white font-semibold mb-4">Top Feature Correlations</h3>
          <div className="space-y-3">
            {top_correlations.slice(0, 10).map((item, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="text-sm text-slate-300 w-32 truncate">{item.feature_a}</span>
                <span className="text-slate-600 text-xs">↔</span>
                <span className="text-sm text-slate-300 w-32 truncate">{item.feature_b}</span>
                <div className="flex-1 progress-bar">
                  <div className="progress-fill" style={{ width: `${(item.correlation * 100).toFixed(0)}%` }} />
                </div>
                <span className="text-sm font-mono font-bold text-brand-400 w-16 text-right">
                  {item.correlation.toFixed(3)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categorical Summaries */}
      {Object.keys(categorical_summaries).length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-white font-semibold mb-4">Categorical Columns</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Object.entries(categorical_summaries).slice(0, 6).map(([col, info]) => (
              <div key={col}>
                <div className="text-sm font-medium text-slate-300 mb-1">{col}</div>
                <div className="text-xs text-slate-600 mb-2">{info.unique_count} unique values</div>
                <div className="space-y-1">
                  {info.top_values.slice(0, 5).map(({ value, count }) => (
                    <div key={value} className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 w-24 truncate">{value}</span>
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(99,102,241,0.1)' }}>
                        <div className="h-full rounded-full" style={{
                          width: `${(count / info.top_values[0].count) * 100}%`,
                          background: 'linear-gradient(90deg,#6366f1,#8b5cf6)'
                        }} />
                      </div>
                      <span className="text-xs font-mono text-slate-500 w-10 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
