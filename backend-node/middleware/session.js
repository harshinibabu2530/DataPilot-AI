/**
 * session.js — In-memory session store
 * Mirrors Python's SESSIONS dict: session_id → session data
 */

import { getDatasetById, isDbReady } from '../services/db.js';

const SESSIONS = new Map();

/**
 * Create a new session and return its ID.
 * @param {string} sessionId
 * @param {object} data
 */
export function createSession(sessionId, data) {
  SESSIONS.set(sessionId, data);
}

/**
 * Get a session by ID. Returns null if not found.
 * @param {string} sessionId
 */
export function getSession(sessionId) {
  return SESSIONS.get(sessionId) || null;
}

/**
 * Update a session's data (shallow merge).
 * @param {string} sessionId
 * @param {object} updates
 */
export function updateSession(sessionId, updates) {
  const existing = SESSIONS.get(sessionId);
  if (existing) {
    SESSIONS.set(sessionId, { ...existing, ...updates });
  }
}

/**
 * Delete a session.
 * @param {string} sessionId
 */
export function deleteSession(sessionId) {
  SESSIONS.delete(sessionId);
}

/**
 * Express middleware — attaches session helpers to req.
 */
export async function sessionMiddleware(req, res, next) {
  const sessionId = req.body?.session_id || req.query?.session_id || req.params?.session_id;

  if (sessionId && !SESSIONS.has(sessionId)) {
    if (isDbReady()) {
      try {
        const dataset = await getDatasetById(sessionId);
        if (dataset) {
          console.log(`[Session Auto-Restore] Dynamically registering session ${sessionId} in Node cache`);
          createSession(sessionId, {
            filename:   dataset.dataset_name,
            file_type:  dataset.file_type,
            domain:     dataset.domain_type || 'generic',
            dataset_id: dataset.id,
            user_id:    dataset.user_id,
          });
        }
      } catch (err) {
        console.error(`[Session Auto-Restore] Failed for ${sessionId}:`, err.message);
      }
    }
  }

  req.getSession = (id) => getSession(id);
  req.requireSession = (id) => {
    const session = getSession(id);
    if (!session) {
      res.status(400).json({ error: 'Session not found. Please upload a file first.' });
      return null;
    }
    return session;
  };
  next();
}
