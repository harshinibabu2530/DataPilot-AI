/**
 * upload.js — POST /api/upload
 * Accepts a multipart file, forwards to Python, persists to Supabase.
 */

import { Router } from 'express';
import multer from 'multer';
import { createSession } from '../middleware/session.js';
import { pyPostFile } from '../services/pythonBridge.js';
import { ensureUser, createDataset, updateDatasetUploadPath, updateDatasetDomain } from '../services/db.js';
import config from '../config.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (config.allowedExtensions.has(ext)) cb(null, true);
    else cb(new Error(`File type '.${ext}' not supported.`));
  },
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided.' });

    // 1. Persist user + dataset to Supabase first if authenticated to get unified datasetId
    let datasetId = req.body.dataset_id || req.body.session_id || null;
    if (req.user) {
      // Ensure user record exists
      await ensureUser(req.user);

      if (!datasetId) {
        // Create dataset record (inserts into Supabase 'datasets' table)
        const dataset = await createDataset(req.user.id, {
          filename: req.file.originalname,
          fileType: req.file.originalname.split('.').pop().toLowerCase(),
          domain:   'generic',
        });
        datasetId = dataset?.id || null;
      }
    }

    // 2. Forward file to Python, passing the datasetId as the session_id
    const result = await pyPostFile(
      '/api/upload',
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      datasetId
    );

    const sessionId = datasetId || result.session_id;

    // 3. Save auto-detected domain to Supabase if we have a datasetId and python returned domain
    if (datasetId && result.domain) {
      try {
        await updateDatasetDomain(datasetId, result.domain);
        console.log(`[Upload] Automatically detected and updated domain to '${result.domain}' in Supabase for dataset ${datasetId}`);
      } catch (dbErr) {
        console.error(`[Upload] Failed to update domain in Supabase for dataset ${datasetId}:`, dbErr.message);
      }
    }

    // 4. Save upload path to Supabase if we have a datasetId and python returned storage_path
    if (datasetId && result.storage_path) {
      try {
        await updateDatasetUploadPath(datasetId, result.storage_path);
        console.log(`[Upload] Successfully updated upload_path in Supabase for dataset ${datasetId}`);
      } catch (dbErr) {
        console.error(`[Upload] Failed to update upload_path in Supabase for dataset ${datasetId}:`, dbErr.message);
      }
    }

    // 5. Cache session metadata in Node using the unified ID and detected domain
    createSession(sessionId, {
      filename:   result.filename,
      file_type:  result.file_type,
      domain:     result.domain || 'generic',
      dataset_id: datasetId,         // ← link to Supabase row
      user_id:    req.user?.id || null,
    });

    // 6. Return result + unified session_id & dataset_id to frontend
    return res.json({ ...result, session_id: sessionId, dataset_id: datasetId });

  } catch (err) {
    const msg = err.response?.data?.error || err.message;
    const status = err.response?.status || 500;
    return res.status(status).json({ error: `Upload failed: ${msg}` });
  }
});

router.use((err, _req, res, _next) => {
  res.status(400).json({ error: err.message });
});

export default router;
