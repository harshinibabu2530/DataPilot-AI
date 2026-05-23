import axios from 'axios'
import { supabase } from '../lib/supabase'

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  timeout: 120000, // 2 min for large files
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor — attach Supabase JWT token ─────────────────── //
API.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers['Authorization'] = `Bearer ${session.access_token}`
  }
  return config
})

// ── Response interceptor — normalise errors ──────────────────────────── //
API.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err?.response?.data?.error || err.message || 'Unknown error'
    return Promise.reject(new Error(msg))
  }
)

// ── API Methods ─────────────────────────────────────────────────────── //
export const api = {
  health: () => API.get('/api/health'),

  upload: (file, datasetId = null) => {
    const form = new FormData()
    form.append('file', file)
    if (datasetId) {
      form.append('dataset_id', datasetId)
    }
    return API.post('/api/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  clean: (sessionId) =>
    API.post('/api/clean', { session_id: sessionId }),

  eda: (sessionId) =>
    API.post('/api/eda', { session_id: sessionId }),

  domain: (sessionId, domain) =>
    API.post('/api/domain', { session_id: sessionId, domain }),

  dashboard: (sessionId) =>
    API.post('/api/dashboard', { session_id: sessionId }),

  insights: (sessionId) =>
    API.post('/api/insights', { session_id: sessionId }),

  chat: (sessionId, message) =>
    API.post('/api/chat', { session_id: sessionId, message }),

  report: (sessionId) =>
    API.post('/api/report', { session_id: sessionId }, { responseType: 'blob' }),

  session: (sessionId) =>
    API.get(`/api/session/${sessionId}`),

  history: () =>
    API.get('/api/history'),

  historyDetail: (datasetId) =>
    API.get(`/api/history/${datasetId}`),

  deleteHistory: (datasetId) =>
    API.delete(`/api/history/${datasetId}`),

  predict: (sessionId, body) =>
    API.post('/api/predict', { session_id: sessionId, ...body }),

  explainChart: (body) =>
    API.post('/api/explain-chart', body),

  generateSql: (sessionId, question) =>
    API.post('/api/generate-sql', { session_id: sessionId, question }),
}

export default api
