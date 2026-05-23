import { useData } from '../context/DataContext'
import { useNavigate } from 'react-router-dom'
import { FileText, Download, Loader2, AlertCircle, CheckCircle, BarChart3, Lightbulb, Brain, Database } from 'lucide-react'

function SectionStatus({ label, icon: Icon, done, color = '#6366f1' }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl"
      style={{ background: done ? 'rgba(16,185,129,0.08)' : 'rgba(99,102,241,0.05)', border: `1px solid ${done ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.1)'}` }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: done ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.1)' }}>
        <Icon className="w-4 h-4" style={{ color: done ? '#10b981' : '#6366f1' }} />
      </div>
      <span className="text-sm text-slate-300 flex-1">{label}</span>
      {done
        ? <CheckCircle className="w-4 h-4 text-emerald-400" />
        : <span className="text-xs text-slate-600">Not ready</span>
      }
    </div>
  )
}

export default function ReportPage() {
  const { filename, sessionId, eda, dashboard, insights, cleaningReport, domainResults, downloadReport, loading } = useData()
  const navigate = useNavigate()

  if (!filename) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <AlertCircle className="w-12 h-12 text-slate-600" />
      <p className="text-slate-500">No dataset loaded. <button onClick={() => navigate('/upload')} className="text-brand-400 hover:underline">Upload first</button></p>
    </div>
  )

  const sections = [
    { label: 'Dataset uploaded',  icon: Database,   done: !!filename },
    { label: 'Data cleaned',      icon: CheckCircle, done: !!cleaningReport },
    { label: 'EDA completed',     icon: BarChart3,  done: !!eda },
    { label: 'Domain analysis',   icon: Brain,      done: !!domainResults },
    { label: 'Insights generated',icon: Lightbulb,  done: insights?.length > 0 },
    { label: 'Dashboard ready',   icon: BarChart3,  done: !!dashboard },
  ]

  const readySections = sections.filter(s => s.done).length
  const isReady = readySections >= 3 // at least upload + EDA + insights

  const narrativeInsight = insights?.find(ins => ins.type === 'narrative')
  const narrativeText = narrativeInsight?.description

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Executive Storytelling Summary */}
      {narrativeText && (
        <div className="glass-card p-8 text-left relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1"
            style={{ background: 'linear-gradient(90deg, #8b5cf6, #6366f1, #10b981)' }} />
          
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.2)' }}>
              <Brain className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">Executive AI Storytelling Report</h3>
              <p className="text-xs text-slate-500 font-medium">Domain-Tailored Storytelling Briefing</p>
            </div>
          </div>

          <div className="space-y-4 text-slate-300 text-sm leading-relaxed max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {narrativeText.split('\n\n').map((para, idx) => (
              <p key={idx}>{para}</p>
            ))}
          </div>
        </div>
      )}

      {/* Report Preview Card */}
      <div className="glass-card p-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1"
          style={{ background: 'linear-gradient(90deg,#6366f1,#8b5cf6,#10b981)' }} />

        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.1))' }}>
          <FileText className="w-8 h-8 text-brand-400" />
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">Analytics Report</h2>
        <p className="text-slate-500 text-sm mb-6">
          Professional PDF report containing EDA summaries, KPIs, AI insights, visualizations, and recommendations.
        </p>

        {/* Report contains */}
        <div className="grid grid-cols-2 gap-3 text-left mb-8">
          {[
            '📊 Dataset Overview',
            '🔍 EDA Statistical Summary',
            '📉 Missing Value Analysis',
            '🔥 Correlation Analysis',
            '📈 KPI Metrics',
            '🤖 AI-Generated Insights',
            '💡 Business Recommendations',
            '📋 Data Cleaning Report',
          ].map(item => (
            <div key={item} className="flex items-center gap-2 text-sm text-slate-400">
              <span>{item}</span>
            </div>
          ))}
        </div>

        <button
          onClick={downloadReport}
          disabled={!isReady || loading.report}
          className="btn-primary text-base px-10 py-4 w-full justify-center disabled:opacity-50"
        >
          {loading.report ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Generating PDF...</>
          ) : (
            <><Download className="w-5 h-5" /> Download PDF Report</>
          )}
        </button>

        {!isReady && (
          <p className="text-amber-400 text-xs mt-3">
            ⚠ Complete more pipeline steps to include richer content in your report
          </p>
        )}
      </div>

      {/* Readiness Checklist */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Report Sections</h3>
          <span className="text-sm text-slate-500">{readySections}/{sections.length} ready</span>
        </div>

        <div className="space-y-2">
          {sections.map((s, i) => <SectionStatus key={i} {...s} />)}
        </div>

        <div className="mt-4">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(readySections / sections.length) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="glass-card p-5" style={{ border: '1px solid rgba(99,102,241,0.15)' }}>
        <h3 className="text-white font-semibold mb-3 text-sm">💡 Report Tips</h3>
        <ul className="space-y-2 text-sm text-slate-400">
          <li>• Run the full pipeline on the Upload page for the most complete report</li>
          <li>• Select a specific domain for domain-specific KPIs in the report</li>
          <li>• Add an OpenAI/Groq key for AI-powered insight narratives</li>
          <li>• Reports are generated fresh each time with the latest analysis</li>
        </ul>
      </div>
    </div>
  )
}
