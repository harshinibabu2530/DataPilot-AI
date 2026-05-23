import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Database, Clock, BarChart3, Brain, MessageSquare,
  FileText, ChevronRight, Trash2, UploadCloud, Search,
  Filter, CheckCircle, AlertCircle, Loader2
} from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import toast from 'react-hot-toast'

const DOMAIN_COLORS = {
  finance:    { bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)',  text: '#6ee7b7' },
  hr:         { bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.3)',  text: '#c4b5fd' },
  retail:     { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)',  text: '#fcd34d' },
  healthcare: { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',   text: '#fca5a5' },
  marketing:  { bg: 'rgba(6,182,212,0.12)',   border: 'rgba(6,182,212,0.3)',   text: '#67e8f9' },
  stock:      { bg: 'rgba(99,102,241,0.12)',  border: 'rgba(99,102,241,0.3)',  text: '#a5b4fc' },
  generic:    { bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.3)', text: '#94a3b8' },
}

const DOMAIN_ICONS = {
  finance: '💰', hr: '👥', retail: '🛒',
  healthcare: '🏥', marketing: '📣', stock: '📈', generic: '🔷',
}

const FILE_TYPE_COLORS = {
  csv:  '#10b981', xlsx: '#6366f1', xls: '#8b5cf6',
  json: '#f59e0b', pdf:  '#ef4444', docx: '#06b6d4',
}

function StatPill({ icon: Icon, label, active, color = '#818cf8' }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg ${active ? '' : 'opacity-30'}`}
      style={{ background: active ? 'rgba(99,102,241,0.1)' : 'transparent', color: active ? color : '#475569' }}>
      <Icon size={11} />
      <span>{label}</span>
      {active && <CheckCircle size={9} className="ml-0.5" style={{ color: '#10b981' }} />}
    </div>
  )
}

function DatasetCard({ dataset, onClick, index, onDelete, isDeleting }) {
  const domain = dataset.domain_type || 'generic'
  const colors = DOMAIN_COLORS[domain] || DOMAIN_COLORS.generic
  const fileExt = dataset.file_type || 'csv'
  const fileColor = FILE_TYPE_COLORS[fileExt] || '#818cf8'

  const date = new Date(dataset.created_at)
  const timeAgo = (() => {
    const diff = (Date.now() - date.getTime()) / 1000
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  })()

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="glass-card p-5 cursor-pointer group transition-all duration-200 hover:border-indigo-500/40"
      style={{ ':hover': { transform: 'translateY(-2px)' } }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* File type badge */}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: `${fileColor}20`, color: fileColor, border: `1px solid ${fileColor}40` }}>
            {fileExt.toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="text-white font-semibold text-sm truncate group-hover:text-indigo-300 transition-colors">
              {dataset.dataset_name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <Clock size={10} className="text-slate-600" />
              <span className="text-xs text-slate-500">{timeAgo}</span>
              <span className="text-slate-700">·</span>
              <span className="text-xs text-slate-500">{date.toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Domain badge & delete button */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
            style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}>
            <span>{DOMAIN_ICONS[domain]}</span>
            <span className="capitalize">{domain}</span>
          </div>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(e)
              }}
              disabled={isDeleting}
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20 disabled:opacity-50"
              title="Delete dataset"
            >
              {isDeleting ? (
                <Loader2 size={13} className="animate-spin text-red-400" />
              ) : (
                <Trash2 size={13} />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Pipeline status */}
      <div className="flex flex-wrap gap-1 mb-3">
        <StatPill icon={BarChart3}    label="EDA"       active={dataset._has_eda}       />
        <StatPill icon={BarChart3}    label="Dashboard"  active={dataset._has_dashboard}  />
        <StatPill icon={Brain}        label="Insights"   active={dataset._has_insights}   color="#10b981" />
        <StatPill icon={MessageSquare} label="Chat"      active={dataset._has_chat}       color="#f59e0b" />
        <StatPill icon={FileText}     label="PDF"        active={dataset._has_report}     color="#ef4444" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'rgba(99,102,241,0.08)' }}>
        <span className="text-xs text-slate-600 font-mono">{dataset.id.slice(0, 8)}…</span>
        <div className="flex items-center gap-1 text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
          <span>View details</span>
          <ChevronRight size={12} />
        </div>
      </div>
    </motion.div>
  )
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { loadDataset } = useData()

  const [datasets, setDatasets]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState('all')
  const [selected, setSelected]   = useState(null)
  const [detail, setDetail]       = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const { data } = await api.history()
      // Enrich each dataset with pipeline status flags
      const enriched = (data.datasets || []).map(d => ({
        ...d,
        _has_eda:       false,
        _has_dashboard: false,
        _has_insights:  false,
        _has_chat:      false,
        _has_report:    false,
      }))
      setDatasets(enriched)
    } catch (err) {
      toast.error('Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  const openDetail = async (dataset) => {
    setSelected(dataset)
    setDetailLoading(true)
    try {
      const { data } = await api.historyDetail(dataset.id)
      setDetail(data)
      // Update pipeline flags
      setDatasets(prev => prev.map(d => d.id === dataset.id ? {
        ...d,
        _has_eda:       !!data.eda,
        _has_dashboard: !!data.dashboard,
        _has_insights:  data.insights?.length > 0,
        _has_chat:      data.chat?.length > 0,
        _has_report:    data.reports?.length > 0,
      } : d))
    } catch {
      toast.error('Failed to load dataset details')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleDelete = async (datasetId) => {
    if (!window.confirm('Are you sure you want to permanently delete this dataset and all associated reports, dashboards, and chat history? This action cannot be undone.')) {
      return
    }
    setDeletingId(datasetId)
    try {
      await api.deleteHistory(datasetId)
      toast.success('Dataset deleted successfully')
      setSelected(null)
      setDetail(null)
      // Remove from list
      setDatasets(prev => prev.filter(d => d.id !== datasetId))
    } catch (err) {
      toast.error(err.message || 'Failed to delete dataset')
    } finally {
      setDeletingId(null)
    }
  }

  const handleLoadWorkspace = (selectedDataset, datasetDetail) => {
    loadDataset(selectedDataset, datasetDetail)
    navigate('/dashboard')
  }

  const DOMAINS = ['all', 'generic', 'finance', 'hr', 'retail', 'healthcare', 'marketing', 'stock']

  const filtered = datasets.filter(d => {
    const matchSearch = d.dataset_name?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || d.domain_type === filter
    return matchSearch && matchFilter
  })

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search datasets…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="auth-input pl-9 py-2.5 text-sm"
          />
        </div>

        {/* Domain filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-slate-500 flex-shrink-0" />
          {DOMAINS.map(d => (
            <button
              key={d}
              onClick={() => setFilter(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                filter === d
                  ? 'text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              style={filter === d ? {
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                boxShadow: '0 2px 10px rgba(99,102,241,0.3)'
              } : {
                background: 'rgba(99,102,241,0.07)',
                border: '1px solid rgba(99,102,241,0.1)'
              }}
            >
              {d === 'all' ? 'All' : `${DOMAIN_ICONS[d]} ${d}`}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-64 gap-3">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          <span className="text-slate-400">Loading your datasets…</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
          {datasets.length === 0 ? (
            <>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(99,102,241,0.1)' }}>
                <Database size={28} className="text-indigo-400" />
              </div>
              <div>
                <p className="text-white font-semibold mb-1">No datasets yet</p>
                <p className="text-slate-500 text-sm">Upload your first dataset to see it here</p>
              </div>
              <button onClick={() => navigate('/upload')} className="btn-primary text-sm px-6 py-2.5">
                <UploadCloud size={15} /> Upload Dataset
              </button>
            </>
          ) : (
            <>
              <AlertCircle size={32} className="text-slate-600" />
              <p className="text-slate-500">No datasets match your search</p>
            </>
          )}
        </div>
      )}

      {/* Two-column layout: list + detail */}
      {!loading && filtered.length > 0 && (
        <div className="flex gap-5">
          {/* Dataset list */}
          <div className={`flex flex-col gap-3 ${selected ? 'w-96 flex-shrink-0' : 'flex-1'}`}>
            {/* Stats bar */}
            <div className="flex items-center gap-4 px-1">
              <span className="text-sm text-slate-500">{filtered.length} dataset{filtered.length !== 1 ? 's' : ''}</span>
            </div>

            {filtered.map((dataset, i) => (
              <DatasetCard
                key={dataset.id}
                dataset={dataset}
                index={i}
                onClick={() => selected?.id === dataset.id ? setSelected(null) : openDetail(dataset)}
                onDelete={() => handleDelete(dataset.id)}
                isDeleting={deletingId === dataset.id}
              />
            ))}
          </div>

          {/* Detail Panel */}
          {selected && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex-1 glass-card p-6 h-fit sticky top-4"
            >
              {detailLoading ? (
                <div className="flex items-center justify-center h-48 gap-3">
                  <Loader2 className="animate-spin text-indigo-400" />
                  <span className="text-slate-400 text-sm">Loading…</span>
                </div>
              ) : (
                <>
                  {/* Dataset header */}
                  <div className="mb-5 pb-4 border-b" style={{ borderColor: 'rgba(99,102,241,0.12)' }}>
                    <h2 className="text-white font-bold text-base mb-1 truncate">{selected.dataset_name}</h2>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="capitalize">{selected.domain_type} domain</span>
                      <span>·</span>
                      <span>{selected.file_type?.toUpperCase()} file</span>
                      <span>·</span>
                      <span>{new Date(selected.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Pipeline summary */}
                  <div className="space-y-3">
                    {/* EDA */}
                    <div className="flex items-start gap-3 p-3 rounded-xl"
                      style={{ background: 'rgba(99,102,241,0.06)' }}>
                      <BarChart3 size={16} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white mb-0.5">EDA Report</div>
                        {detail?.eda ? (
                          <div className="text-xs text-slate-400">
                            Completed · {new Date(detail.eda.created_at).toLocaleDateString()}
                          </div>
                        ) : <div className="text-xs text-slate-600">Not generated</div>}
                      </div>
                      {detail?.eda && <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />}
                    </div>

                    {/* Dashboard */}
                    <div className="flex items-start gap-3 p-3 rounded-xl"
                      style={{ background: 'rgba(99,102,241,0.06)' }}>
                      <BarChart3 size={16} className="text-violet-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white mb-0.5">Dashboard</div>
                        {detail?.dashboard ? (
                          <div className="text-xs text-slate-400">
                            {detail.dashboard.dashboard_name} · {detail.dashboard.template_type}
                          </div>
                        ) : <div className="text-xs text-slate-600">Not generated</div>}
                      </div>
                      {detail?.dashboard && <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />}
                    </div>

                    {/* Insights */}
                    <div className="flex items-start gap-3 p-3 rounded-xl"
                      style={{ background: 'rgba(99,102,241,0.06)' }}>
                      <Brain size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white mb-0.5">AI Insights</div>
                        {detail?.insights?.length > 0 ? (
                          <div className="text-xs text-slate-400">{detail.insights.length} insights generated</div>
                        ) : <div className="text-xs text-slate-600">Not generated</div>}
                      </div>
                      {detail?.insights?.length > 0 && <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />}
                    </div>

                    {/* Chat history */}
                    <div className="flex items-start gap-3 p-3 rounded-xl"
                      style={{ background: 'rgba(99,102,241,0.06)' }}>
                      <MessageSquare size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white mb-0.5">Chat History</div>
                        {detail?.chat?.length > 0 ? (
                          <div className="text-xs text-slate-400">{detail.chat.length} messages</div>
                        ) : <div className="text-xs text-slate-600">No conversations</div>}
                      </div>
                      {detail?.chat?.length > 0 && <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />}
                    </div>

                    {/* PDF Reports */}
                    <div className="flex items-start gap-3 p-3 rounded-xl"
                      style={{ background: 'rgba(99,102,241,0.06)' }}>
                      <FileText size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white mb-0.5">PDF Reports</div>
                        {detail?.reports?.length > 0 ? (
                          <div className="text-xs text-slate-400">{detail.reports.length} report{detail.reports.length > 1 ? 's' : ''} generated</div>
                        ) : <div className="text-xs text-slate-600">Not generated</div>}
                      </div>
                      {detail?.reports?.length > 0 && <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />}
                    </div>
                  </div>

                  {/* Latest insights preview */}
                  {detail?.insights?.length > 0 && (
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgba(99,102,241,0.1)' }}>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Latest Insights</p>
                      <div className="space-y-2">
                        {detail.insights.slice(0, 3).map((ins, i) => (
                          <div key={i} className="text-xs text-slate-400 leading-relaxed p-2 rounded-lg"
                            style={{ background: 'rgba(16,185,129,0.05)', borderLeft: '2px solid rgba(16,185,129,0.3)' }}>
                            {ins.insight_text?.slice(0, 120)}{ins.insight_text?.length > 120 ? '…' : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions (Load & Delete buttons) */}
                  <div className="mt-5 pt-4 border-t flex items-center justify-between" style={{ borderColor: 'rgba(99,102,241,0.12)' }}>
                    <button
                      onClick={() => handleLoadWorkspace(selected, detail)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all shadow-md hover:shadow-indigo-500/20 hover:opacity-90 animate-fade-in"
                      style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
                    >
                      <Database size={13} />
                      <span>Load into Workspace</span>
                    </button>

                    <button
                      onClick={() => handleDelete(selected.id)}
                      disabled={deletingId === selected.id}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all border border-red-500/20 hover:border-red-500/40 disabled:opacity-50"
                    >
                      {deletingId === selected.id ? (
                        <>
                          <Loader2 size={13} className="animate-spin text-red-400" />
                          <span>Deleting…</span>
                        </>
                      ) : (
                        <>
                          <Trash2 size={13} />
                          <span>Delete Dataset</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Dataset ID */}
                  <div className="mt-4 pt-3 border-t" style={{ borderColor: 'rgba(99,102,241,0.08)' }}>
                    <span className="text-xs text-slate-600 font-mono">ID: {selected.id}</span>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </div>
      )}
    </div>
  )
}
