import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { UploadCloud, FileText, Database, Loader2, CheckCircle, ChevronRight, X, Bot } from 'lucide-react'
import toast from 'react-hot-toast'

const DOMAINS = [
  { value: 'generic',    label: '🔷 General',    desc: 'Any dataset' },
  { value: 'finance',    label: '💰 Finance',    desc: 'Revenue, profit, cost' },
  { value: 'hr',         label: '👥 HR & People', desc: 'Attrition, salary' },
  { value: 'retail',     label: '🛒 Retail',     desc: 'Sales, products' },
  { value: 'healthcare', label: '🏥 Healthcare', desc: 'Patients, outcomes' },
  { value: 'marketing',  label: '📣 Marketing',  desc: 'CTR, conversions' },
  { value: 'stock',      label: '📈 Stock',      desc: 'Price, volume, returns' },
]

const FORMATS = ['CSV', 'Excel', 'JSON', 'PDF', 'DOCX']

export default function UploadPage() {
  const {
    uploadFile,
    runFullPipeline,
    runClean,
    runEDA,
    runDomain,
    runDashboard,
    runInsights,
    loading,
    preview,
    columns,
    dtypes,
    filename,
    sessionId,
    currentStep,
    domain
  } = useData()
  const [selectedDomain, setSelectedDomain] = useState('generic')

  // Synchronize selection when the AI auto-detects the domain
  useEffect(() => {
    if (domain) {
      setSelectedDomain(domain)
      console.log(`[UploadPage] Auto-selected detected domain: ${domain}`)
    }
  }, [domain])
  const [uploadedFile, setUploadedFile] = useState(null)
  const navigate = useNavigate()

  const STEPS = [
    { num: 1, name: 'Clean' },
    { num: 2, name: 'EDA' },
    { num: 3, name: 'Domain' },
    { num: 4, name: 'Dashboard' },
    { num: 5, name: 'Insights' }
  ]

  const STEP_DETAILS = {
    1: {
      title: 'Data Cleaning & Normalization',
      question: 'Would you like to proceed with standardizing the datatypes and filling missing values?',
      btnText: 'Clean My Dataset',
      runFn: runClean,
      loadingKey: 'clean',
      findings: "We've parsed your dataset. Some columns might have missing values or inconsistent types that can affect downstream analysis.",
      explanation: "We will apply modern cleaning algorithms to impute missing rows, standardize datetime formatting, and clean up column names."
    },
    2: {
      title: 'Exploratory Data Analysis (EDA)',
      question: 'Shall we trigger the statistical analysis engine and plot the distribution matrices?',
      btnText: 'Run Exploratory Data Analysis',
      runFn: runEDA,
      loadingKey: 'eda',
      findings: "Your dataset looks structurally sound. Now we need to understand the underlying statistical distribution, correlations, and anomalies.",
      explanation: "We will run full descriptive statistics, compute numerical correlations, detect outliers, and generate distribution metrics for all variables."
    },
    3: {
      title: 'Domain Customization & KPIs',
      question: 'Which domain context best fits your business goals for this dataset?',
      btnText: 'Apply Business Domain Rules',
      runFn: () => runDomain(selectedDomain),
      loadingKey: 'domain',
      findings: "We have processed the raw data. To deliver tailormade KPIs and predictive models, we need a domain context.",
      explanation: "Applying standard metrics based on the chosen business domain will enable advanced, domain-specific visual dashboards."
    },
    4: {
      title: 'Interactive Dashboard Assembly',
      question: 'Ready to build your live interactive dashboard workspace?',
      btnText: 'Assemble Interactive Dashboard',
      runFn: runDashboard,
      loadingKey: 'dashboard',
      findings: "The business domain context is set. We can now construct a rich dashboard tailored to your metrics.",
      explanation: "We will assemble custom visualization configurations, charts (bar, line, scatter, pie), and layout templates for the workspace."
    },
    5: {
      title: 'AI Insights Generation',
      question: 'Shall we trigger the AI insight generation to complete your executive-ready workspace?',
      btnText: 'Generate AI Insights',
      runFn: runInsights,
      loadingKey: 'insights',
      findings: "Your interactive dashboard is ready. Let's run our deep learning / heuristic agents to extract actionable text insights.",
      explanation: "We will execute an LLM agent that scans statistical outliers, correlation shifts, and trend lines to write executive summary cards."
    }
  }

  const onDrop = useCallback(async (accepted) => {
    const file = accepted[0]
    if (!file) return
    setUploadedFile(file)
    try {
      await uploadFile(file)
    } catch {/* handled in context */}
  }, [uploadFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/json': ['.json'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
  })

  const handleSkipGuide = async () => {
    if (!sessionId) { toast.error('Please upload a file first'); return }
    try {
      await runFullPipeline(sessionId, selectedDomain)
    } catch { /* handled */ }
  }

  const isUploading  = loading.upload
  const isAnalyzing  = loading.clean || loading.eda || loading.domain || loading.dashboard || loading.insights
  const anyLoading   = isUploading || isAnalyzing
  const done         = currentStep === 6

  const currentStepDetail = STEP_DETAILS[currentStep]

  return (
    <div className="space-y-6">
      {/* Supported formats */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-slate-500">Supported formats:</span>
        {FORMATS.map(f => (
          <span key={f} className="badge badge-brand">{f}</span>
        ))}
      </div>

      {/* Drop Zone */}
      <div {...getRootProps()} className={`upload-zone ${isDragActive ? 'dragover' : ''}`}>
        <input {...getInputProps()} />
        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-12 h-12 text-brand-400 animate-spin" />
            <p className="text-slate-300 font-medium">Parsing your file...</p>
          </div>
        ) : filename ? (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle className="w-12 h-12 text-emerald-400" />
            <p className="text-white font-semibold text-lg">{filename}</p>
            <p className="text-slate-500 text-sm">File uploaded successfully. Drop another to replace.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center animate-float"
              style={{ background: 'rgba(99,102,241,0.15)' }}>
              <UploadCloud className="w-8 h-8" style={{ color: '#818cf8' }} />
            </div>
            <div>
              <p className="text-white font-semibold text-lg mb-1">
                {isDragActive ? 'Drop your file here' : 'Drag & drop your dataset'}
              </p>
              <p className="text-slate-500 text-sm">or click to browse • Max 50MB</p>
            </div>
          </div>
        )}
      </div>

      {/* Stepper Progress bar & Agent Assistant Panel */}
      {filename && (
        <div className="space-y-6">
          {/* Stepper Progress indicator */}
          <div className="glass-card p-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              {STEPS.map((step, idx) => {
                const isCompleted = currentStep > step.num
                const isActive = currentStep === step.num
                
                return (
                  <div key={step.num} className="flex-1 flex items-center">
                    <div className="flex sm:flex-col items-center gap-3 sm:gap-1 relative z-10 flex-1">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                          isCompleted
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                            : isActive
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-4 ring-indigo-600/20 scale-105'
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}
                      >
                        {isCompleted ? <CheckCircle size={15} /> : step.num}
                      </div>
                      <span
                        className={`text-xs font-semibold mt-1 transition-all duration-300 ${
                          isActive
                            ? 'text-indigo-400'
                            : isCompleted
                            ? 'text-emerald-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {step.name}
                      </span>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div className="hidden sm:block flex-1 h-0.5 bg-slate-800 rounded mx-2 relative -top-3">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded transition-all duration-500"
                          style={{ width: isCompleted ? '100%' : '0%' }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Agent Assistant Panel */}
          {currentStepDetail && (
            <div className="glass-card p-6 animate-fade-in relative overflow-hidden">
              <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
              
              <div className="flex flex-col md:flex-row gap-5 items-start">
                {/* Bot Avatar with pulsing green light */}
                <div className="flex-shrink-0 relative mx-auto md:mx-0">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center animate-pulse">
                    <Bot className="w-8 h-8 text-indigo-400" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900 animate-ping" />
                  <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900" />
                </div>

                {/* Core Agent Message */}
                <div className="flex-1 space-y-4">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md">
                      Agent Assistant • Step {currentStep} of 5
                    </span>
                    <h3 className="text-white font-bold text-xl mt-2">{currentStepDetail.title}</h3>
                  </div>

                  {/* Findings & What we will do */}
                  <div className="space-y-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">🔍 What I Found</h4>
                      <p className="text-slate-300 text-sm mt-1 leading-relaxed">{currentStepDetail.findings}</p>
                    </div>
                    <div className="pt-3 border-t border-slate-900">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">⚙️ What Will Change</h4>
                      <p className="text-slate-300 text-sm mt-1 leading-relaxed">{currentStepDetail.explanation}</p>
                    </div>
                  </div>

                  {/* Domain customisation selector - ONLY shown during step 3 */}
                  {currentStep === 3 && (
                    <div className="space-y-3 p-4 rounded-xl bg-slate-950/40 border border-slate-800/50 animate-fade-in">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">🎯 Select Dataset Domain Context</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                        {DOMAINS.map(({ value, label, desc }) => (
                          <button
                            key={value}
                            onClick={() => setSelectedDomain(value)}
                            className={`p-3 rounded-xl text-left transition-all duration-200 border ${
                              selectedDomain === value
                                ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/5'
                                : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                            }`}
                          >
                            <div className="text-xs font-semibold text-white mb-0.5 truncate">{label}</div>
                            <div className="text-[10px] text-slate-500 truncate">{desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Clarifying Question & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/10">
                    <div className="flex-1">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">🤔 Agent Clarification</span>
                      <p className="text-slate-200 text-sm font-medium mt-0.5">{currentStepDetail.question}</p>
                    </div>
                    
                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <button
                        onClick={handleSkipGuide}
                        disabled={anyLoading}
                        className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-all"
                      >
                        Skip Guide (Auto-Run)
                      </button>
                      <button
                        onClick={currentStepDetail.runFn}
                        disabled={anyLoading}
                        className="btn-primary text-xs px-5 py-2.5 rounded-lg inline-flex items-center gap-1.5"
                      >
                        {loading[currentStepDetail.loadingKey] ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <span>{currentStepDetail.btnText}</span>
                            <ChevronRight size={13} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Done state */}
          {done && (
            <div className="glass-card p-6 animate-fade-in"
              style={{ border: '1px solid rgba(16,185,129,0.3)' }}>
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-emerald-400" />
                <h3 className="text-white font-semibold">Pipeline Complete!</h3>
              </div>
              <p className="text-slate-400 text-sm mb-5">
                Your dataset has been cleaned, analyzed, and insights generated. Explore the results:
              </p>
              <div className="flex flex-wrap gap-3">
                {[
                  { label: 'Dashboard', to: '/dashboard' },
                  { label: 'EDA Report', to: '/eda' },
                  { label: 'AI Insights', to: '/insights' },
                  { label: 'Chat', to: '/chat' },
                  { label: 'PDF Report', to: '/report' },
                ].map(({ label, to }) => (
                  <button key={to} onClick={() => navigate(to)} className="btn-secondary text-sm py-2 px-4">
                    {label} <ChevronRight className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview Table */}
      {preview?.length > 0 && (
        <div className="glass-card p-6 animate-fade-in">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Database className="w-4 h-4 text-brand-400" />
            Data Preview (first 10 rows)
          </h3>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  {columns.slice(0, 8).map(col => (
                    <th key={col}>
                      <div>{col}</div>
                      <div className="font-normal text-slate-600 normal-case tracking-normal mt-0.5">
                        {dtypes[col] || ''}
                      </div>
                    </th>
                  ))}
                  {columns.length > 8 && <th>+{columns.length - 8} more</th>}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i}>
                    {columns.slice(0, 8).map(col => (
                      <td key={col} className="font-mono text-xs">
                        {row[col] === null || row[col] === undefined
                          ? <span className="text-slate-600 italic">null</span>
                          : String(row[col])}
                      </td>
                    ))}
                    {columns.length > 8 && <td>...</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
