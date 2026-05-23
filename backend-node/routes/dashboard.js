/**
 * dashboard.js — POST /api/dashboard
 */
import { Router } from 'express';
import { pyPost } from '../services/pythonBridge.js';
import { getSession } from '../middleware/session.js';
import { saveDashboard } from '../services/db.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { session_id } = req.body || {};
    if (!session_id) return res.status(400).json({ error: 'session_id is required.' });

    const result = await pyPost('/api/dashboard', { session_id });

    // Persist dashboard config to Supabase
    const session = getSession(session_id);
    if (session?.dataset_id) {
      await saveDashboard(session.dataset_id, session.domain || 'generic', result.dashboard || result);
    }

    return res.json(result);
  } catch (err) {
    const msg = err.response?.data?.error || err.message;
    const status = err.response?.status || 500;
    return res.status(status).json({ error: `Dashboard generation failed: ${msg}` });
  }
});

export default router;
