/**
 * explain.js — POST /api/explain-chart
 * Express router proxying chart series data & clicked indices to the Python microservice.
 */
import { Router } from 'express';
import { pyPost } from '../services/pythonBridge.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const result = await pyPost('/api/explain-chart', req.body);
    return res.json(result);
  } catch (err) {
    const msg = err.response?.data?.error || err.message;
    const status = err.response?.status || 500;
    return res.status(status).json({ error: `Chart explanation failed: ${msg}` });
  }
});

export default router;
