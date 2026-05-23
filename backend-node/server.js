/**
 * server.js — DataPilot AI Node.js/Express Gateway
 *
 * Architecture:
 *  ┌─────────────┐        ┌──────────────────────┐
 *  │   Frontend  │ ──────▶│  Node.js (port 5000) │
 *  │  React/Vite │        │   Express Gateway     │
 *  └─────────────┘        └──────────┬───────────┘
 *                                    │  internal HTTP
 *                         ┌──────────▼───────────┐
 *                         │  Python FastAPI       │
 *                         │  (port 5001, local)  │
 *                         └──────────────────────┘
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import config from './config.js';
import { sessionMiddleware } from './middleware/session.js';
import { requireAuth } from './middleware/auth.js';

// ── Routes ────────────────────────────────────────────────────
import healthRouter    from './routes/health.js';
import uploadRouter    from './routes/upload.js';
import cleanRouter     from './routes/clean.js';
import edaRouter       from './routes/eda.js';
import domainRouter    from './routes/domain.js';
import dashboardRouter from './routes/dashboard.js';
import insightsRouter  from './routes/insights.js';
import chatRouter      from './routes/chat.js';
import reportRouter    from './routes/report.js';
import sessionRouter   from './routes/session.js';
import historyRouter   from './routes/history.js';
import predictRouter   from './routes/predict.js';
import explainRouter   from './routes/explain.js';
import sqlRouter       from './routes/sql.js';

// ── App Setup ─────────────────────────────────────────────────
const app = express();

// CORS
app.use(cors({
  origin: [config.frontendUrl, 'http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Body parsers
app.use(express.json({ limit: `${config.maxUploadSizeMb}mb` }));
app.use(express.urlencoded({ extended: true, limit: `${config.maxUploadSizeMb}mb` }));

// Session middleware
app.use(sessionMiddleware);

// ── Register Routes ───────────────────────────────────────────
// Public routes
app.use('/api/health',    healthRouter);

// Protected routes (require Supabase JWT — skipped in local dev mode)
app.use('/api/upload',    requireAuth, uploadRouter);
app.use('/api/clean',     requireAuth, cleanRouter);
app.use('/api/eda',       requireAuth, edaRouter);
app.use('/api/domain',    requireAuth, domainRouter);
app.use('/api/dashboard', requireAuth, dashboardRouter);
app.use('/api/insights',  requireAuth, insightsRouter);
app.use('/api/chat',      requireAuth, chatRouter);
app.use('/api/report',    requireAuth, reportRouter);
app.use('/api/session',   requireAuth, sessionRouter);
app.use('/api/history',   requireAuth, historyRouter);
app.use('/api/predict',   requireAuth, predictRouter);
app.use('/api/explain-chart', requireAuth, explainRouter);
app.use('/api/generate-sql',  requireAuth, sqlRouter);

// ── 404 Handler ───────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ── Global Error Handler ──────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ error: err.message || 'Internal server error.' });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(config.port, '0.0.0.0', () => {
  console.log('='.repeat(60));
  console.log('  DataPilot AI — Node.js/Express Gateway');
  console.log(`  Listening on   : http://localhost:${config.port}`);
  console.log(`  Python service : ${config.pythonServiceUrl}`);
  console.log(`  LLM            : ${config.hasLlm() ? '✓ ' + config.llmProvider.toUpperCase() : '✗ No key (rule-based fallback)'}`);
  console.log(`  Supabase       : ${config.hasSupabase() ? '✓ Connected' : '✗ Local session mode'}`);
  console.log('='.repeat(60));
});

export default app;
