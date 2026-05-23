/**
 * report.js — POST /api/report
 * Streams the PDF from Python and records it in Supabase.
 */
import { Router } from 'express';
import { pyPostStream } from '../services/pythonBridge.js';
import { getSession } from '../middleware/session.js';
import { savePdfReport } from '../services/db.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { session_id } = req.body || {};
    if (!session_id) return res.status(400).json({ error: 'session_id is required.' });

    const pyResponse = await pyPostStream('/api/report', { session_id });

    // Record PDF generation in Supabase
    const session = getSession(session_id);
    if (session?.dataset_id) {
      await savePdfReport(session.dataset_id, `report_${session_id.slice(0, 8)}.pdf`);
    }

    // Forward PDF headers + stream to client
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      pyResponse.headers['content-disposition'] ||
        `attachment; filename="datapilot_report_${session_id.slice(0, 8)}.pdf"`
    );
    pyResponse.data.pipe(res);

  } catch (err) {
    const msg = err.response?.data?.error || err.message;
    const status = err.response?.status || 500;
    return res.status(status).json({ error: `Report generation failed: ${msg}` });
  }
});

export default router;
