/**
 * insights.js — POST /api/insights
 */
import { Router } from 'express';
import { pyPost } from '../services/pythonBridge.js';
import { getSession } from '../middleware/session.js';
import { saveInsights } from '../services/db.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { session_id } = req.body || {};
    if (!session_id) return res.status(400).json({ error: 'session_id is required.' });

    const result = await pyPost('/api/insights', { session_id });

    // Persist each insight to Supabase
    const session = getSession(session_id);
    if (session?.dataset_id && result.insights?.length) {
      await saveInsights(session.dataset_id, result.insights);
    }

    return res.json(result);
  } catch (err) {
    const msg = err.response?.data?.error || err.message;
    const status = err.response?.status || 500;
    return res.status(status).json({ error: `Insight generation failed: ${msg}` });
  }
});

export default router;
