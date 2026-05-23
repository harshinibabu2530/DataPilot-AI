/**
 * session.js — GET /api/session/:id
 */

import { Router } from 'express';
import { pyPost } from '../services/pythonBridge.js';
import axios from 'axios';
import config from '../config.js';

const router = Router();

router.get('/:session_id', async (req, res) => {
  try {
    const { session_id } = req.params;

    const response = await axios.get(
      `${config.pythonServiceUrl}/api/session/${session_id}`
    );
    return res.json(response.data);
  } catch (err) {
    const msg = err.response?.data?.error || err.message;
    const status = err.response?.status || 500;
    return res.status(status).json({ error: msg });
  }
});

export default router;
