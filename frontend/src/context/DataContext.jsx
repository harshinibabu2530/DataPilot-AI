import { createContext, useContext, useReducer, useCallback } from 'react'
import { api } from '../api/client'
import toast from 'react-hot-toast'

// ── Helpers for parsing history insights ────────────────────────────── //
const cleanType = (type) => {
  if (!type) return 'summary'
  const t = type.toLowerCase()
  if (t.includes('trend')) return 'trend'
  if (t.includes('anomaly') || t.includes('outlier')) return 'anomaly'
  if (t.includes('distribution') || t.includes('correlation')) return 'correlation'
  if (t.includes('recommendation')) return 'recommendation'
  return 'summary'
}

const cleanPriority = (priority) => {
  if (!priority) return 'medium'
  const p = priority.toLowerCase()
  if (p === 'high' || p === 'medium' || p === 'low') return p
  return 'medium'
}

// ── Domain Display Map ──────────────────────────────────────────────── //
const DOMAINS_MAP = {
  finance: 'Finance 💰',
  hr: 'HR & People 👥',
  retail: 'Retail 🛒',
  healthcare: 'Healthcare 🏥',
  marketing: 'Marketing 📣',
  stock: 'Stock Market 📈',
  generic: 'General 🔷'
}

// ── Initial State ───────────────────────────────────────────────────── //
const initialState = {
  sessionId: null,
  filename: null,
  fileType: null,
  domain: 'generic',
  rowCount: 0,
  columnCount: 0,
  columns: [],
  dtypes: {},
  preview: [],
  cleaningReport: null,
  eda: null,
  predictions: null,
  domainResults: null,
  dashboard: null,
  insights: [],
  loading: {},        // { upload: bool, clean: bool, eda: bool, ... }
  errors: {},
  currentStep: 0,     // 0=upload, 1=clean, 2=eda, 3=domain, 4=dashboard, 5=insights
}

// ── Reducer ─────────────────────────────────────────────────────────── //
function reducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: { ...state.loading, [action.key]: action.value } }
    case 'SET_ERROR':
      return { ...state, errors: { ...state.errors, [action.key]: action.value } }
    case 'UPLOAD_SUCCESS':
      return {
        ...state,
        sessionId: action.payload.session_id,
        filename: action.payload.filename,
        fileType: action.payload.file_type,
        rowCount: action.payload.row_count,
        columnCount: action.payload.column_count,
        columns: action.payload.columns,
        dtypes: action.payload.dtypes,
        preview: action.payload.preview,
        domain: action.payload.domain || 'generic',
        currentStep: 1,
      }
    case 'CLEAN_SUCCESS':
      return {
        ...state,
        cleaningReport: action.payload.cleaning_report,
        preview: action.payload.preview || state.preview,
        currentStep: Math.max(state.currentStep, 2),
      }
    case 'EDA_SUCCESS': {
      const edaData = action.payload.eda
      const edaOverview = edaData?.overview || {}
      const edaMissing = edaData?.missing_values || []
      const extractedCols = edaMissing.map(m => m.column)
      return {
        ...state,
        eda: edaData,
        predictions: edaOverview.predictions || state.predictions,
        rowCount: state.rowCount || edaOverview.rows || 0,
        columnCount: state.columnCount || edaOverview.columns || 0,
        columns: state.columns?.length > 0 ? state.columns : (extractedCols || []),
        currentStep: Math.max(state.currentStep, 3),
      }
    }
    case 'PREDICT_SUCCESS': {
      const pred = action.payload.predictions;
      const updatedEda = state.eda ? { ...state.eda } : { overview: {} };
      updatedEda.overview = updatedEda.overview || {};
      updatedEda.overview.predictions = pred;
      return {
        ...state,
        predictions: pred,
        eda: updatedEda
      }
    }
    case 'DOMAIN_SUCCESS':
      return {
        ...state,
        domain: action.payload.domain,
        domainResults: action.payload.domain_results,
        currentStep: Math.max(state.currentStep, 4),
      }
    case 'DASHBOARD_SUCCESS':
      return { ...state, dashboard: action.payload.dashboard, currentStep: Math.max(state.currentStep, 5) }
    case 'INSIGHTS_SUCCESS':
      return { ...state, insights: action.payload.insights, currentStep: Math.max(state.currentStep, 6) }
    case 'SET_DOMAIN':
      return { ...state, domain: action.domain }
    case 'LOAD_DATASET':
      const formattedChat = (action.payload.chat || []).flatMap(c => [
        { role: 'user', content: c.user_question },
        { role: 'assistant', content: c.ai_response }
      ])
      return {
        ...state,
        sessionId: action.payload.sessionId,
        filename: action.payload.filename,
        fileType: action.payload.fileType,
        domain: action.payload.domain || 'generic',
        rowCount: action.payload.rowCount || 0,
        columnCount: action.payload.columnCount || 0,
        columns: action.payload.columns || [],
        dtypes: action.payload.dtypes || {},
        preview: action.payload.preview || [],
        cleaningReport: action.payload.cleaningReport || null,
        eda: action.payload.eda || null,
        predictions: action.payload.predictions || null,
        domainResults: action.payload.domainResults || null,
        dashboard: action.payload.dashboard || null,
        insights: action.payload.insights || [],
        chatHistory: formattedChat,
        currentStep: 6, // fully processed
      }
    case 'RESET':
      return { ...initialState }
    default:
      return state
  }
}

// ── Context ─────────────────────────────────────────────────────────── //
const DataContext = createContext(null)

export function DataProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const setLoading = (key, val) => dispatch({ type: 'SET_LOADING', key, value: val })
  const setError   = (key, val) => dispatch({ type: 'SET_ERROR', key, value: val })

  // ── Upload ──────────────────────────────────────────────────────── //
  const uploadFile = useCallback(async (file, datasetId = null) => {
    setLoading('upload', true)
    setError('upload', null)
    try {
      const { data } = await api.upload(file, datasetId)
      dispatch({ type: 'UPLOAD_SUCCESS', payload: data })
      toast.success(`✓ ${data.filename} uploaded (${data.row_count.toLocaleString()} rows)`)
      
      // Showcase a premium real-time AI identified category alert toast
      if (data.domain && data.domain !== 'generic') {
        const domainLabel = DOMAINS_MAP[data.domain] || data.domain
        toast(`🤖 AI identified dataset category: ${domainLabel}`, {
          icon: '📊',
          duration: 4000
        })
      } else {
        toast(`📊 AI analyzed dataset structure as general context`, {
          icon: '🤖',
          duration: 4000
        })
      }
      return data
    } catch (err) {
      setError('upload', err.message)
      toast.error(`Upload failed: ${err.message}`)
      throw err
    } finally {
      setLoading('upload', false)
    }
  }, [])

  // ── Auto Pipeline: clean + EDA + domain + dashboard + insights ── //
  const runFullPipeline = useCallback(async (sessionId, domain = 'generic') => {
    const steps = [
      { key: 'clean',     fn: () => api.clean(sessionId),          action: 'CLEAN_SUCCESS' },
      { key: 'eda',       fn: () => api.eda(sessionId),            action: 'EDA_SUCCESS' },
      { key: 'domain',    fn: () => api.domain(sessionId, domain), action: 'DOMAIN_SUCCESS' },
      { key: 'dashboard', fn: () => api.dashboard(sessionId),      action: 'DASHBOARD_SUCCESS' },
      { key: 'insights',  fn: () => api.insights(sessionId),       action: 'INSIGHTS_SUCCESS' },
    ]

    for (const step of steps) {
      setLoading(step.key, true)
      try {
        const { data } = await step.fn()
        dispatch({ type: step.action, payload: data })
      } catch (err) {
        setError(step.key, err.message)
        toast.error(`${step.key} failed: ${err.message}`)
      } finally {
        setLoading(step.key, false)
      }
    }
    toast.success('🎉 Analytics pipeline complete!')
  }, [])

  // ── Individual steps ────────────────────────────────────────────── //
  const runClean = useCallback(async () => {
    if (!state.sessionId) return
    setLoading('clean', true)
    try {
      const { data } = await api.clean(state.sessionId)
      dispatch({ type: 'CLEAN_SUCCESS', payload: data })
      toast.success('Data cleaned successfully')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading('clean', false)
    }
  }, [state.sessionId])

  const runEDA = useCallback(async () => {
    if (!state.sessionId) return
    setLoading('eda', true)
    try {
      const { data } = await api.eda(state.sessionId)
      dispatch({ type: 'EDA_SUCCESS', payload: data })
      toast.success('EDA completed')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading('eda', false)
    }
  }, [state.sessionId])

  const runDomain = useCallback(async (domain) => {
    if (!state.sessionId) return
    setLoading('domain', true)
    try {
      const { data } = await api.domain(state.sessionId, domain)
      dispatch({ type: 'DOMAIN_SUCCESS', payload: data })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading('domain', false)
    }
  }, [state.sessionId])

  const runDashboard = useCallback(async () => {
    if (!state.sessionId) return
    setLoading('dashboard', true)
    try {
      const { data } = await api.dashboard(state.sessionId)
      dispatch({ type: 'DASHBOARD_SUCCESS', payload: data })
      toast.success('Dashboard generated')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading('dashboard', false)
    }
  }, [state.sessionId])

  const runInsights = useCallback(async () => {
    if (!state.sessionId) return
    setLoading('insights', true)
    try {
      const { data } = await api.insights(state.sessionId)
      dispatch({ type: 'INSIGHTS_SUCCESS', payload: data })
      toast.success(`${data.count} insights generated`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading('insights', false)
    }
  }, [state.sessionId])

  const downloadReport = useCallback(async () => {
    if (!state.sessionId) return
    setLoading('report', true)
    try {
      const { data } = await api.report(state.sessionId)
      const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `insightforge_report.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('PDF report downloaded!')
    } catch (err) {
      toast.error(`Report failed: ${err.message}`)
    } finally {
      setLoading('report', false)
    }
  }, [state.sessionId])

  const loadDataset = useCallback((dataset, detail = {}) => {
    const edaRow = detail?.eda
    
    // Safely parse column names from history details
    let cols = []
    if (edaRow?.missing_values && Array.isArray(edaRow.missing_values)) {
      cols = edaRow.missing_values.map(m => m.column)
    } else if (edaRow?.statistics && Array.isArray(edaRow.statistics)) {
      cols = edaRow.statistics.map(s => s.column)
    }

    // Reconstruct full EDA results object
    const reconstructedEda = edaRow ? {
      overview: edaRow.charts_data?.overview || {},
      statistical_summary: edaRow.statistics || [],
      missing_values: edaRow.missing_values || [],
      correlation: edaRow.correlations || {},
      distributions: edaRow.charts_data?.distributions || {},
      categorical_summaries: edaRow.charts_data?.categorical_summaries || {},
      top_correlations: edaRow.charts_data?.top_correlations || [],
      data_quality: edaRow.charts_data?.data_quality || null,
    } : null

    const restoredPredictions = reconstructedEda?.overview?.predictions || null

    const formattedInsights = (detail?.insights || []).map(ins => {
      try {
        const parsed = JSON.parse(ins.insight_text)
        return {
          id: ins.id,
          type: cleanType(parsed.type || ins.insight_type),
          title: parsed.title || 'AI Insight',
          description: parsed.description || parsed.text || ins.insight_text,
          priority: cleanPriority(parsed.priority)
        }
      } catch (e) {
        return {
          id: ins.id,
          type: cleanType(ins.insight_type),
          title: 'AI Insight',
          description: ins.insight_text,
          priority: 'medium'
        }
      }
    })

    const dashConfig = detail?.dashboard?.dashboard_config || detail?.dashboard || null
    const cleanRep = detail?.cleaned?.preprocessing_summary || detail?.cleaned || null

    dispatch({
      type: 'LOAD_DATASET',
      payload: {
        sessionId: dataset.id,
        filename: dataset.dataset_name,
        fileType: dataset.file_type,
        domain: dataset.domain_type,
        rowCount: dataset.row_count || 0,
        columnCount: dataset.column_count || 0,
        columns: cols.length > 0 ? cols : [],
        dtypes: {},
        preview: [],
        cleaningReport: cleanRep,
        eda: reconstructedEda,
        predictions: restoredPredictions,
        domainResults: null, // Set initially to null; will be populated asynchronously below
        dashboard: dashConfig,
        insights: formattedInsights,
        chat: detail.chat || [],
      }
    })

    // Asynchronously fetch and restore EDA report in background
    api.eda(dataset.id)
      .then(({ data }) => {
        dispatch({ type: 'EDA_SUCCESS', payload: data })
      })
      .catch(err => console.error('[Session Restore] Failed to auto-restore EDA results:', err))

    // Asynchronously fetch and restore domain KPIs / recommendations in background
    if (dataset.domain_type) {
      api.domain(dataset.id, dataset.domain_type)
        .then(({ data }) => {
          dispatch({ type: 'DOMAIN_SUCCESS', payload: data })
        })
        .catch(err => console.error('[Session Restore] Failed to auto-restore domain results:', err))
    }

    toast.success(`✓ Loaded ${dataset.dataset_name} into workspace`)
  }, [dispatch])

  const runPrediction = useCallback(async (body) => {
    if (!state.sessionId) return
    setLoading('predict', true)
    setError('predict', null)
    try {
      const { data } = await api.predict(state.sessionId, body)
      dispatch({ type: 'PREDICT_SUCCESS', payload: data })
      toast.success('✓ Predictive analysis modeling complete!')
      return data.predictions
    } catch (err) {
      setError('predict', err.message)
      toast.error(`Modeling failed: ${err.message}`)
      throw err
    } finally {
      setLoading('predict', false)
    }
  }, [state.sessionId])

  const reset = useCallback(() => dispatch({ type: 'RESET' }), [])

  const value = {
    ...state,
    uploadFile,
    runFullPipeline,
    runClean,
    runEDA,
    runDomain,
    runDashboard,
    runInsights,
    runPrediction,
    downloadReport,
    loadDataset,
    reset,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within <DataProvider>')
  return ctx
}
