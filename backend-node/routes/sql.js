/**
 * sql.js — POST /api/generate-sql
 * Express router proxying natural language questions to the Python SQL generator microservice.
 */
import { Router } from 'express';
import { pyPost } from '../services/pythonBridge.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const result = await pyPost('/api/generate-sql', req.body);
    return res.json(result);
  } catch (err) {
    const msg = err.response?.data?.error || err.message;
    const status = err.response?.status || 500;
    return res.status(status).json({ error: `SQL generation failed: ${msg}` });
  }
});

export default router;
