/**
 * chat.js — POST /api/chat
 */
import { Router } from 'express';
import { pyPost } from '../services/pythonBridge.js';
import { getSession } from '../middleware/session.js';
import { saveChatMessage } from '../services/db.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { session_id, message } = req.body || {};
    if (!session_id) return res.status(400).json({ error: 'session_id is required.' });
    if (!message?.trim()) return res.status(400).json({ error: 'message is required.' });

    const result = await pyPost('/api/chat', { session_id, message: message.trim() });

    // Persist Q&A pair to Supabase
    const session = getSession(session_id);
    if (session?.dataset_id) {
      await saveChatMessage(session.dataset_id, message.trim(), result.reply || result.response || result.answer || '');
    }

    return res.json(result);
  } catch (err) {
    const msg = err.response?.data?.error || err.message;
    const status = err.response?.status || 500;
    return res.status(status).json({ error: `Chat failed: ${msg}` });
  }
});

export default router;
