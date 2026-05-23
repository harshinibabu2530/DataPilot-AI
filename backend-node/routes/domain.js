/**
 * domain.js — POST /api/domain
 */
import { Router } from 'express';
import { pyPost } from '../services/pythonBridge.js';
import { getSession, updateSession } from '../middleware/session.js';
import { updateDatasetDomain } from '../services/db.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { session_id, domain = 'generic' } = req.body || {};
    if (!session_id) return res.status(400).json({ error: 'session_id is required.' });

    const result = await pyPost('/api/domain', { session_id, domain });

    // Update domain in session + Supabase
    const session = getSession(session_id);
    updateSession(session_id, { domain });
    if (session?.dataset_id) {
      await updateDatasetDomain(session.dataset_id, domain);
    }

    return res.json(result);
  } catch (err) {
    const msg = err.response?.data?.error || err.message;
    const status = err.response?.status || 500;
    return res.status(status).json({ error: `Domain analysis failed: ${msg}` });
  }
});

export default router;
