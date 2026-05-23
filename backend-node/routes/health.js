/**
 * health.js — GET /api/health
 * Returns Node server status and Python microservice status.
 */

import { Router } from 'express';
import axios from 'axios';
import config from '../config.js';

const router = Router();

router.get('/', async (req, res) => {
  let pythonStatus = 'unknown';
  let pythonData = {};

  try {
    const pyRes = await axios.get(`${config.pythonServiceUrl}/api/health`, {
      timeout: 5000,
    });
    pythonStatus = 'ok';
    pythonData = pyRes.data;
  } catch {
    pythonStatus = 'unavailable';
  }

  return res.json({
    status: 'ok',
    server: 'node',
    version: '1.0.0',
    node_version: process.version,
    llm_configured: config.hasLlm(),
    llm_provider: config.llmProvider,
    supabase_configured: config.hasSupabase(),
    python_service: {
      status: pythonStatus,
      url: config.pythonServiceUrl,
      ...pythonData,
    },
  });
});

export default router;
