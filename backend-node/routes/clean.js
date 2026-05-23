/**
 * clean.js — POST /api/clean
 */
import { Router } from 'express';
import { pyPost } from '../services/pythonBridge.js';
import { getSession } from '../middleware/session.js';
import { saveCleanedDataset } from '../services/db.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { session_id } = req.body || {};
    if (!session_id) return res.status(400).json({ error: 'session_id is required.' });

    const result = await pyPost('/api/clean', { session_id });

    // Persist cleaning summary to Supabase
    const session = getSession(session_id);
    if (session?.dataset_id) {
      await saveCleanedDataset(session.dataset_id, result.cleaning_report || {});
    }

    return res.json(result);
  } catch (err) {
    const msg = err.response?.data?.error || err.message;
    const status = err.response?.status || 500;
    return res.status(status).json({ error: `Cleaning failed: ${msg}` });
  }
});

export default router;
