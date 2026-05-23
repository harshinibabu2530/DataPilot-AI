/**
 * predict.js — POST /api/predict
 * Express router proxying predictive analytics calculations to the Python microservice.
 */
import { Router } from 'express';
import { pyPost } from '../services/pythonBridge.js';
import { getSession } from '../middleware/session.js';
import { saveEdaPredictions } from '../services/db.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { session_id } = req.body || {};
    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required.' });
    }

    // Call the Python FastAPI predictive calculation endpoint
    const result = await pyPost('/api/predict', req.body);

    // Sync predictions back to the Supabase dataset eda_reports JSONB column
    const session = getSession(session_id);
    if (session?.dataset_id && result?.predictions) {
      await saveEdaPredictions(session.dataset_id, result.predictions);
    }

    return res.json(result);
  } catch (err) {
    const msg = err.response?.data?.error || err.message;
    const status = err.response?.status || 500;
    return res.status(status).json({ error: `Prediction failed: ${msg}` });
  }
});

export default router;
