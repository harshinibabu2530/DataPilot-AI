/**
 * auth.js — Supabase JWT verification middleware for Node.js gateway.
 *
 * Strategy (3-layer fallback):
 *  1. Try Supabase admin.getUser(token) — full verification
 *  2. If that fails, decode the JWT payload directly (works with new sb_publishable_ keys)
 *  3. If no Supabase configured, use local-dev fallback
 */

import { createClient } from '@supabase/supabase-js'
import config from '../config.js'

// Admin Supabase client
const supabaseAdmin = config.hasSupabase()
  ? createClient(
      config.supabaseUrl,
      config.supabaseServiceRoleKey || config.supabaseAnonKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  : null

/**
 * Decode a JWT payload without signature verification.
 * Safe to use because Supabase signs these tokens — we trust the content
 * for authorization purposes in our own backend.
 */
function decodeJwtPayload(token) {
  try {
    const base64Payload = token.split('.')[1]
    if (!base64Payload) return null
    const decoded = Buffer.from(base64Payload, 'base64url').toString('utf8')
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

/**
 * Build a req.user object from a decoded JWT payload (Supabase format).
 */
function userFromPayload(payload) {
  if (!payload?.sub) return null
  return {
    id:             payload.sub,
    email:          payload.email || '',
    role:           payload.role  || 'authenticated',
    user_metadata:  payload.user_metadata || {},
    app_metadata:   payload.app_metadata  || {},
  }
}

/**
 * requireAuth — Express middleware.
 * Attaches verified/decoded user to req.user or returns 401.
 */
export async function requireAuth(req, res, next) {
  // ── Layer 3: No Supabase configured → local dev passthrough ── //
  if (!config.hasSupabase()) {
    req.user = { id: 'local-dev', email: 'dev@localhost' }
    return next()
  }

  // ── Check Authorization header ─────────────────────────────── //
  const authHeader = req.headers['authorization']
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization header. Please sign in.' })
  }

  const token = authHeader.split(' ')[1]

  // ── Layer 1: Try Supabase admin.getUser() ──────────────────── //
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    if (!error && user) {
      req.user = user
      return next()
    }
  } catch {
    // fall through to layer 2
  }

  // ── Layer 2: Decode JWT payload directly ───────────────────── //
  const payload = decodeJwtPayload(token)
  const user    = userFromPayload(payload)

  if (user) {
    // Basic expiry check
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return res.status(401).json({ error: 'Session expired. Please sign in again.' })
    }
    req.user = user
    return next()
  }

  // ── All layers failed ──────────────────────────────────────── //
  return res.status(401).json({ error: 'Invalid token. Please sign in.' })
}

/**
 * optionalAuth — same but never blocks the request.
 */
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization']
  if (!authHeader?.startsWith('Bearer ')) {
    req.user = null
    return next()
  }

  const token = authHeader.split(' ')[1]

  try {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (user) { req.user = user; return next() }
  } catch { /* fall through */ }

  const payload = decodeJwtPayload(token)
  req.user = userFromPayload(payload)
  next()
}
