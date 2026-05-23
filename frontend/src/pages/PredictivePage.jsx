import { useEffect, useState } from 'react'
import { useData } from '../context/DataContext'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import {
  TrendingUp, Loader2, Settings, AlertCircle, HelpCircle, Sparkles,
  Award, Clock, ArrowRight, ShieldAlert, Cpu, BarChart3, Users
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useTheme } from '../context/ThemeContext'

export default function PredictivePage() {
  const {
    sessionId, filename, columns, eda, predictions, loading, runPrediction
  } = useData()
  
  const navigate = useNavigate()
  const { theme, preset } = useTheme()
  const COLORS = preset.chartColors

  // Form State
  const [taskType, setTaskType] = useState('timeseries') // 'timeseries' | 'churn'
  const [targetCol, setTargetCol] = useState('')
  const [dateCol, setDateCol] = useState('')
  const [algorithm, setAlgorithm] = useState('prophet')
  const [horizon, setHorizon] = useState(30)

  // Auto-detect columns on mount/data change
  useEffect(() => {
    if (columns && columns.length > 0) {
      // Find numeric columns (from EDA statistical summary if available)
      const numericCols = eda?.statistical_summary?.map(s => s.column) || columns
      const dateCols = columns.filter(c => {
        const lower = c.toLowerCase()
        return lower.includes('date') || lower.includes('year') || lower.includes('time') || lower.includes('month') || lower.includes('day')
      })

      // Default target
      if (taskType === 'timeseries') {
        const potentialTarget = numericCols.find(c => !dateCols.includes(c) && c.toLowerCase() !== 'id' && c.toLowerCase() !== 'user_id')
        setTargetCol(potentialTarget || columns[0])
      } else {
        const potentialTarget = columns.find(c => c.toLowerCase().includes('churn') || c.toLowerCase().includes('fatigue') || c.toLowerCase().includes('level') || c.toLowerCase().includes('status'))
        setTargetCol(potentialTarget || columns[columns.length - 1])
      }

      // Default date
      if (dateCols.length > 0) {
        setDateCol(dateCols[0])
      } else {
        setDateCol('')
      }
    }
  }, [columns, taskType, eda])

  // Sync state if predictions already exist in context
  useEffect(() => {
    if (predictions) {
      setTaskType(predictions.task_type)
      setTargetCol(predictions.target_column)
      if (predictions.task_type === 'timeseries') {
        setDateCol(predictions.date_column || '')
        setAlgorithm(predictions.algorithm?.toLowerCase() || 'prophet')
      }
    }
  }, [predictions])

  if (!filename) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
        <AlertCircle className="w-12 h-12 text-slate-600 animate-pulse" />
        <p className="text-slate-400">No active dataset loaded. Please upload a file to perform predictive modeling.</p>
        <button onClick={() => navigate('/upload')} className="btn-primary flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> Go to Upload
        </button>
      </div>
    )
  }

  const handleTrain = async (e) => {
    e.preventDefault()
    if (!targetCol) {
      toast.error('Please select a target column to model.')
      return
    }

    const payload = {
      prediction_type: taskType,
      target_col: targetCol,
      date_col: taskType === 'timeseries' ? dateCol : null,
      algorithm: taskType === 'timeseries' ? algorithm : 'forest',
      horizon: taskType === 'timeseries' ? horizon : 30
    }

    try {
      await runPrediction(payload)
    } catch (err) {
      console.error(err)
    }
  }

  // Choose colors for dialect gauge
  const getDialColor = (score) => {
    if (score > 0.8) return '#10b981' // Emerald
    if (score > 0.5) return '#f59e0b' // Amber
    return '#ef4444' // Rose Red
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Cpu className="w-6 h-6 text-indigo-400" />
          Predictive Analytics Suite ⭐
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Perform state-of-the-art time series forecasting or execute classification risk-ledger analyses with fully-automated machine learning models.
        </p>
      </div>

      {/* Model Setup Config Bar */}
      <div className="glass-card p-6 border border-slate-800 bg-slate-950/60 relative overflow-visible">
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
          <Settings className="w-4 h-4 text-indigo-400" />
          Model Configuration Panel
        </h3>

        <form onSubmit={handleTrain} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
          {/* Task Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Modeling Task Type</label>
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => { setTaskType('timeseries'); setAlgorithm('prophet'); }}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  taskType === 'timeseries' ? 'text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                }`}
                style={taskType === 'timeseries' ? { backgroundImage: `linear-gradient(to right, ${preset.primary}, ${preset.secondary})` } : {}}
              >
                Time Series
              </button>
              <button
                type="button"
                onClick={() => { setTaskType('churn'); setAlgorithm('forest'); }}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  taskType === 'churn' ? 'text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                }`}
                style={taskType === 'churn' ? { backgroundImage: `linear-gradient(to right, ${preset.primary}, ${preset.secondary})` } : {}}
              >
                Churn / Risk
              </button>
            </div>
          </div>

          {/* Target Column Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Target Metric Column</label>
            <select
              value={targetCol}
              onChange={(e) => setTargetCol(e.target.value)}
              className="w-full text-xs bg-slate-900 border border-slate-800 text-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 transition-all"
            >
              <option value="">-- Choose Target --</option>
              {taskType === 'timeseries'
                ? (eda?.statistical_summary?.map(s => s.column) || columns).map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))
                : columns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))
              }
            </select>
          </div>

          {/* Date Column (Time series only) */}
          {taskType === 'timeseries' && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Datetime Column (Optional)</label>
              <select
                value={dateCol}
                onChange={(e) => setDateCol(e.target.value)}
                className="w-full text-xs bg-slate-900 border border-slate-800 text-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 transition-all"
              >
                <option value="">-- Auto-Generate Dates --</option>
                {columns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          )}

          {/* Algorithm choice */}
          {taskType === 'timeseries' ? (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Forecasting Algorithm</label>
              <select
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value)}
                className="w-full text-xs bg-slate-900 border border-slate-800 text-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 transition-all"
              >
                <option value="prophet">Prophet (Fourier Additive fallback)</option>
                <option value="arima">ARIMA (Autoregressive Lag Diff fallback)</option>
                <option value="forest">Random Forest Residual Regressor</option>
                <option value="linear">Linear Trend Regression</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Classification Algorithm</label>
              <div className="w-full text-xs bg-slate-900/60 border border-slate-800 text-slate-500 rounded-xl p-2.5 select-none font-medium cursor-not-allowed">
                Random Forest Classifier (Adaptive)
              </div>
            </div>
          )}

          {/* Forecast Horizon slider (Time series only) */}
          {taskType === 'timeseries' && (
            <div className="md:col-span-2 lg:col-span-3">
              <div className="flex justify-between text-xs font-medium text-slate-400 mb-2">
                <span>Forecasting Horizon Days</span>
                <span className="text-indigo-400 font-semibold">{horizon} Days</span>
              </div>
              <input
                type="range"
                min="7"
                max="90"
                value={horizon}
                onChange={(e) => setHorizon(Number(e.target.value))}
                className="w-full accent-indigo-500 h-1.5 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          )}

          {/* Action trigger button */}
          <div className={`${taskType === 'timeseries' ? 'md:col-span-2 lg:col-span-1' : 'md:col-span-2'}`}>
            <button
              type="submit"
              disabled={loading.predict}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r text-white hover:opacity-90 active:scale-95 transition-all shadow-lg hover:shadow-indigo-500/20 disabled:opacity-50 animate-glow"
              style={{
                backgroundImage: `linear-gradient(to right, ${preset.primary}, var(--brand-dark), ${preset.secondary})`
              }}
            >
              {loading.predict ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  Generating Intelligence...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-white" />
                  Train Model & Predict
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/*empty showcase state */}
      {!predictions && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 border border-slate-800 bg-slate-950/40 relative overflow-hidden group hover:border-indigo-500/35 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/10 transition-all" />
            <TrendingUp className="w-8 h-8 text-cyan-400 mb-4" />
            <h4 className="text-base font-bold text-slate-100 mb-2">Out-of-Sample Forecasting</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Resamples timeline gaps, computes seasonal cycles (yearly/weekly/monthly), and fits trend projections up to 90 steps into the future.
            </p>
          </div>

          <div className="glass-card p-6 border border-slate-800 bg-slate-950/40 relative overflow-hidden group hover:border-indigo-500/35 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-violet-500/10 transition-all" />
            <Users className="w-8 h-8 text-violet-400 mb-4" />
            <h4 className="text-base font-bold text-slate-100 mb-2">Churn & Risk Analytics</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Splits feature datasets, trains a recursive Random Forest classifier, and measures high-precision individual risks.
            </p>
          </div>

          <div className="glass-card p-6 border border-slate-800 bg-slate-950/40 relative overflow-hidden group hover:border-indigo-500/35 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/10 transition-all" />
            <ShieldAlert className="w-8 h-8 text-emerald-400 mb-4" />
            <h4 className="text-base font-bold text-slate-100 mb-2">Zero Database Migrations</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ensures instant persistence by caching models directly in-memory and serializing predictions into the Supabase JSONB tables.
            </p>
          </div>
        </div>
      )}

      {/* Model Dashboard Results */}
      {predictions && (
        <div className="space-y-6">
          {/* Main Visual Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* 1. Interactive Visual Chart Box */}
            <div className="lg:col-span-2 glass-card p-6 border border-slate-800 bg-slate-950/60 flex flex-col h-[400px]">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4 shrink-0">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                {predictions.task_type === 'timeseries'
                  ? `Historical vs Forecasted Projections (${predictions.algorithm})`
                  : 'Customer Churn Feature Importances'
                }
              </h3>

              <div className="flex-1 w-full min-h-0">
                {predictions.task_type === 'timeseries' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={[
                        ...predictions.history.map(h => ({ ...h, isFuture: false })),
                        ...predictions.forecast.map(f => ({ ...f, isFuture: true }))
                      ]}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorHistory" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={preset.primary} stopOpacity={0.2}/>
                          <stop offset="95%" stopColor={preset.primary} stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={preset.secondary} stopOpacity={0.2}/>
                          <stop offset="95%" stopColor={preset.secondary} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis
                        dataKey="date"
                        stroke="#475569"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#475569"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--surface-800)',
                          border: '1px solid var(--border)',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '11px'
                        }}
                      />
                      <Legend
                        verticalAlign="top"
                        height={36}
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: '10px' }}
                      />
                      <Area
                        name="Historical Data"
                        type="monotone"
                        dataKey="value"
                        stroke={preset.primary}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorHistory)"
                        connectNulls
                        dot={false}
                        activeDot={{ r: 4 }}
                        data={predictions.history}
                      />
                      <Area
                        name="Out-of-sample Forecast"
                        type="monotone"
                        dataKey="value"
                        stroke={preset.secondary}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorForecast)"
                        connectNulls
                        dot={false}
                        activeDot={{ r: 4 }}
                        data={predictions.forecast}
                      />
                      <Area
                        name="95% Confidence Interval"
                        type="monotone"
                        dataKey="upper"
                        stroke="none"
                        fill={`${preset.secondary}14`}
                        connectNulls
                        data={predictions.forecast}
                      />
                      <Area
                        name="Lower Interval"
                        type="monotone"
                        dataKey="lower"
                        stroke="none"
                        fill="none"
                        connectNulls
                        data={predictions.forecast}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  // Churn Drivers horizontal bars
                  <div className="space-y-4 py-2 h-full overflow-y-auto">
                    {predictions.feature_importances.slice(0, 6).map((feat, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-300">{feat.feature}</span>
                          <span style={{ color: preset.primary }} className="font-semibold">{(feat.importance * 100).toFixed(1)}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800/40">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${feat.importance * 100}%`,
                              backgroundImage: `linear-gradient(to right, ${preset.primary}, ${preset.secondary})`
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 2. Custom Dial Circles & Details Card */}
            <div className="glass-card p-6 border border-slate-800 bg-slate-950/60 flex flex-col items-center justify-between h-[400px]">
              <h3 className="text-sm font-semibold text-slate-200 self-start mb-2">
                Model Fit & Reliability
              </h3>

              {/* Styled Circular SVG Dial */}
              <div className="relative w-44 h-44 flex items-center justify-center my-auto">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={getDialColor(predictions.task_type === 'timeseries' ? predictions.metrics.r2 : predictions.metrics.accuracy)}
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={
                      2 * Math.PI * 40 * (1.0 - (predictions.task_type === 'timeseries' ? predictions.metrics.r2 : predictions.metrics.accuracy))
                    }
                    strokeLinecap="round"
                    style={{ filter: 'drop-shadow(0px 0px 4px rgba(99,102,241,0.2))' }}
                  />
                </svg>
                <div className="absolute flex flex-col items-center text-center">
                  <span className="text-3xl font-extrabold text-white">
                    {predictions.task_type === 'timeseries'
                      ? `${(predictions.metrics.r2 * 100).toFixed(1)}%`
                      : `${(predictions.metrics.accuracy * 100).toFixed(1)}%`
                    }
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
                    {predictions.task_type === 'timeseries' ? 'R-Squared (R²)' : 'Accuracy'}
                  </span>
                </div>
              </div>

              {/* Metrics Capsules */}
              <div className="w-full grid grid-cols-2 gap-4 border-t border-slate-800/40 pt-4 mt-auto">
                {predictions.task_type === 'timeseries' ? (
                  <>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                      <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">RMSE</div>
                      <div className="text-sm font-bold text-slate-200 mt-0.5">{predictions.metrics.rmse.toFixed(4)}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                      <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">MAE</div>
                      <div className="text-sm font-bold text-slate-200 mt-0.5">{predictions.metrics.mae.toFixed(4)}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                      <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">F1-Score</div>
                      <div className="text-sm font-bold text-slate-200 mt-0.5">{(predictions.metrics.f1 * 100).toFixed(1)}%</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                      <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Precision</div>
                      <div className="text-sm font-bold text-slate-200 mt-0.5">{(predictions.metrics.precision * 100).toFixed(1)}%</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Churn Risk Ledger Section */}
          {predictions.task_type === 'churn' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Users className="w-4.5 h-4.5 text-indigo-400" />
                Strategic Individual Risk Ledger Profile
              </h3>

              <div className="glass-card overflow-hidden border border-slate-800 bg-slate-950/60 rounded-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="p-4">Entity ID</th>
                        <th className="p-4">Risk Probability</th>
                        <th className="p-4">Predicted Category</th>
                        <th className="p-4">Demographics / Feature Profile</th>
                        <th className="p-4 text-center">Risk Assessment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {predictions.risk_ledger.slice(0, 10).map((row, idx) => {
                        const isCritical = row.risk_probability > 0.7
                        const isWarning = row.risk_probability > 0.4 && row.risk_probability <= 0.7

                        let borderStyle = 'border-l-4 border-l-emerald-500'
                        let badgeStyle = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        let bgStyle = ''
                        let label = 'Low Risk'

                        if (isCritical) {
                          borderStyle = 'border-l-4 border-l-rose-500'
                          badgeStyle = 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          bgStyle = 'bg-rose-500/[0.02]'
                          label = 'Critical Risk'
                        } else if (isWarning) {
                          borderStyle = 'border-l-4 border-l-amber-500'
                          badgeStyle = 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          bgStyle = 'bg-amber-500/[0.02]'
                          label = 'Medium Warning'
                        }

                        return (
                          <tr key={idx} className={`${bgStyle} hover:bg-slate-900/40 transition-colors`}>
                            <td className={`p-4 font-semibold text-slate-300 ${borderStyle}`}>
                              {row.id}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <span className={`font-bold text-sm ${isCritical ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'}`}>
                                  {(row.risk_probability * 100).toFixed(1)}%
                                </span>
                                <div className="hidden sm:block w-20 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800/40">
                                  <div
                                    className={`h-full rounded-full ${
                                      isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                                    }`}
                                    style={{ width: `${row.risk_probability * 100}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-slate-400 font-medium">
                              {row.predicted_label}
                            </td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-1.5">
                                {Object.entries(row.details || {}).map(([key, val]) => (
                                  <span key={key} className="text-[10px] bg-slate-900 text-slate-500 px-2 py-0.5 rounded-md border border-slate-800/40">
                                    {key}: <b className="text-slate-300 font-medium">{val}</b>
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${badgeStyle}`}>
                                {label}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {predictions.risk_ledger.length > 10 && (
                  <div className="p-3 bg-slate-900/20 text-center border-t border-slate-800 text-[10px] text-slate-500">
                    Showing top 10 highest-risk entities of {predictions.risk_ledger.length} total entries. Rerun calculations to filter profiles.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
