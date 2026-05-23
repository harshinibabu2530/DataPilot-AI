/**
 * db.js — Supabase database service for DataPilot AI.
 *
 * All interactions with Supabase tables go through this module.
 * Uses the service-role key (admin) to bypass RLS for server-side operations.
 *
 * Tables:
 *  users              — app user profiles (mirrors auth.users)
 *  datasets           — uploaded datasets per user
 *  cleaned_datasets   — cleaning results
 *  eda_reports        — EDA results
 *  dashboards         — dashboard configs
 *  ai_insights        — AI-generated insights
 *  chatbot_history    — chat Q&A pairs
 *  pdf_reports        — generated PDF report records
 *  dashboard_templates— reusable dashboard templates
 */

import { createClient } from '@supabase/supabase-js';
import config from '../config.js';

// ── Admin Client (server-side, bypasses RLS) ─────────────────────── //
const db = config.hasSupabase()
  ? createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

/**
 * Returns false if Supabase is not configured.
 * Routes use this to gracefully skip DB writes in local dev mode.
 */
export function isDbReady() {
  return Boolean(db);
}

// ── Helper: safe insert ───────────────────────────────────────────── //
async function insert(table, data) {
  if (!db) return null;
  const { data: row, error } = await db.from(table).insert(data).select().single();
  if (error) {
    console.error(`[DB] insert(${table}) error:`, error.message);
    return null;
  }
  return row;
}

// ── Helper: safe upsert ───────────────────────────────────────────── //
async function upsert(table, data, onConflict) {
  if (!db) return null;
  const { data: row, error } = await db
    .from(table)
    .upsert(data, { onConflict })
    .select()
    .single();
  if (error) {
    console.error(`[DB] upsert(${table}) error:`, error.message);
    return null;
  }
  return row;
}

// ── Helper: safe update ───────────────────────────────────────────── //
async function update(table, match, data) {
  if (!db) return null;
  let q = db.from(table).update(data);
  for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
  const { data: row, error } = await q.select().single();
  if (error) {
    console.error(`[DB] update(${table}) error:`, error.message);
    return null;
  }
  return row;
}

// ── Helper: safe select ───────────────────────────────────────────── //
async function select(table, match = {}, opts = {}) {
  if (!db) return [];
  let q = db.from(table).select(opts.columns || '*');
  for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
  if (opts.order) q = q.order(opts.order, { ascending: opts.asc ?? false });
  if (opts.limit)  q = q.limit(opts.limit);
  const { data: rows, error } = await q;
  if (error) {
    console.error(`[DB] select(${table}) error:`, error.message);
    return [];
  }
  return rows || [];
}

// ═══════════════════════════════════════════════════════════════════ //
// ── USERS ─────────────────────────────────────────────────────────── //
// ═══════════════════════════════════════════════════════════════════ //

/**
 * Upsert a user record from Supabase auth user.
 * Called on every authenticated request so the row stays current.
 */
export async function ensureUser(authUser) {
  if (!authUser) return null;
  return upsert(
    'users',
    {
      id:    authUser.id,
      email: authUser.email,
      name:  authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
    },
    'id'
  );
}

// ═══════════════════════════════════════════════════════════════════ //
// ── DATASETS ──────────────────────────────────────────────────────── //
// ═══════════════════════════════════════════════════════════════════ //

/**
 * Insert a new dataset record when a file is uploaded.
 * Returns the created dataset row (including its UUID `id`).
 */
export async function createDataset(userId, { filename, fileType, domain = 'generic', uploadPath = null }) {
  return insert('datasets', {
    user_id:      userId,
    dataset_name: filename,
    file_type:    fileType,
    domain_type:  domain,
    upload_path:  uploadPath,
  });
}

/**
 * Update the domain on an existing dataset.
 */
export async function updateDatasetDomain(datasetId, domain) {
  return update('datasets', { id: datasetId }, { domain_type: domain });
}

/**
 * Update the upload path on an existing dataset.
 */
export async function updateDatasetUploadPath(datasetId, uploadPath) {
  return update('datasets', { id: datasetId }, { upload_path: uploadPath });
}

/**
 * Fetch a single dataset by ID.
 */
export async function getDatasetById(datasetId) {
  const rows = await select('datasets', { id: datasetId }, { limit: 1 });
  return rows[0] || null;
}

/**
 * Fetch all datasets for a user (most recent first).
 */
export async function getUserDatasets(userId) {
  return select('datasets', { user_id: userId }, {
    order: 'created_at',
    asc:   false,
  });
}

/**
 * Delete a dataset from the database (will cascade delete related reports, insights, etc. in other tables).
 * Verifies that the dataset belongs to the specified user.
 */
export async function deleteDataset(userId, datasetId) {
  if (!db) return null;
  const { data, error } = await db
    .from('datasets')
    .delete()
    .eq('id', datasetId)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) {
    console.error('[DB] deleteDataset error:', error.message);
    return null;
  }
  return data;
}

// ═══════════════════════════════════════════════════════════════════ //
// ── CLEANED DATASETS ──────────────────────────────────────────────── //
// ═══════════════════════════════════════════════════════════════════ //

export async function saveCleanedDataset(datasetId, preprocessingSummary) {
  return insert('cleaned_datasets', {
    dataset_id:             datasetId,
    preprocessing_summary:  preprocessingSummary,
  });
}

export async function getCleanedDataset(datasetId) {
  const rows = await select('cleaned_datasets', { dataset_id: datasetId }, { limit: 1 });
  return rows[0] || null;
}

// ═══════════════════════════════════════════════════════════════════ //
// ── EDA REPORTS ───────────────────────────────────────────────────── //
// ═══════════════════════════════════════════════════════════════════ //

export async function saveEdaReport(datasetId, edaData) {
  const { eda = {} } = edaData;
  return insert('eda_reports', {
    dataset_id:     datasetId,
    missing_values: eda.missing_values   || null,
    correlations:   eda.correlation      || eda.correlations || null,
    statistics:     eda.statistical_summary || eda.statistics || null,
    charts_data:    {
      overview:              eda.overview || {},
      distributions:         eda.distributions || {},
      categorical_summaries: eda.categorical_summaries || {},
      top_correlations:      eda.top_correlations || [],
      data_quality:          eda.data_quality || null,
    },
  });
}

export async function getEdaReport(datasetId) {
  const rows = await select('eda_reports', { dataset_id: datasetId }, { limit: 1 });
  return rows[0] || null;
}

export async function saveEdaPredictions(datasetId, predictions) {
  if (!db) return null;
  try {
    const { data: rows, error: selectErr } = await db
      .from('eda_reports')
      .select('*')
      .eq('dataset_id', datasetId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (selectErr) {
      console.error('[DB] saveEdaPredictions select error:', selectErr.message);
      return null;
    }

    if (!rows || rows.length === 0) {
      // If no EDA report exists, we can create one with minimal data
      return insert('eda_reports', {
        dataset_id: datasetId,
        charts_data: {
          overview: { predictions }
        }
      });
    }

    const report = rows[0];
    const chartsData = report.charts_data || {};
    chartsData.overview = chartsData.overview || {};
    chartsData.overview.predictions = predictions;

    const { data: updatedRow, error: updateErr } = await db
      .from('eda_reports')
      .update({ charts_data: chartsData })
      .eq('id', report.id)
      .select()
      .single();

    if (updateErr) {
      console.error('[DB] saveEdaPredictions update error:', updateErr.message);
      return null;
    }
    return updatedRow;
  } catch (err) {
    console.error('[DB] saveEdaPredictions system error:', err.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════ //
// ── DASHBOARDS ────────────────────────────────────────────────────── //
// ═══════════════════════════════════════════════════════════════════ //

export async function saveDashboard(datasetId, domainType, dashboardData) {
  return insert('dashboards', {
    dataset_id:       datasetId,
    dashboard_name:   `Dashboard — ${new Date().toLocaleDateString()}`,
    template_type:    domainType || 'generic',
    dashboard_config: dashboardData,
  });
}

export async function getDashboard(datasetId) {
  const rows = await select('dashboards', { dataset_id: datasetId }, {
    order: 'created_at',
    limit: 1,
  });
  return rows[0] || null;
}

// ═══════════════════════════════════════════════════════════════════ //
// ── AI INSIGHTS ───────────────────────────────────────────────────── //
// ═══════════════════════════════════════════════════════════════════ //

export async function saveInsights(datasetId, insights = []) {
  if (!db || !insights.length) return null;
  const rows = insights.map((ins) => ({
    dataset_id:    datasetId,
    insight_text:  typeof ins === 'string' ? ins : ins.text || JSON.stringify(ins),
    insight_type:  typeof ins === 'object' ? ins.type || 'general' : 'general',
  }));
  const { error } = await db.from('ai_insights').insert(rows);
  if (error) console.error('[DB] saveInsights error:', error.message);
  return !error;
}

export async function getInsights(datasetId) {
  return select('ai_insights', { dataset_id: datasetId }, {
    order: 'created_at',
    asc:   true,
  });
}

// ═══════════════════════════════════════════════════════════════════ //
// ── CHATBOT HISTORY ───────────────────────────────────────────────── //
// ═══════════════════════════════════════════════════════════════════ //

export async function saveChatMessage(datasetId, question, aiResponse) {
  return insert('chatbot_history', {
    dataset_id:    datasetId,
    user_question: question,
    ai_response:   aiResponse,
  });
}

export async function getChatHistory(datasetId) {
  return select('chatbot_history', { dataset_id: datasetId }, {
    order: 'created_at',
    asc:   true,
  });
}

// ═══════════════════════════════════════════════════════════════════ //
// ── PDF REPORTS ───────────────────────────────────────────────────── //
// ═══════════════════════════════════════════════════════════════════ //

export async function savePdfReport(datasetId, reportPath = 'generated-in-memory') {
  return insert('pdf_reports', {
    dataset_id:  datasetId,
    report_path: reportPath,
  });
}

export async function getPdfReports(datasetId) {
  return select('pdf_reports', { dataset_id: datasetId }, {
    order: 'generated_at',
    asc:   false,
  });
}

// ═══════════════════════════════════════════════════════════════════ //
// ── HISTORY (cross-table summary) ─────────────────────────────────── //
// ═══════════════════════════════════════════════════════════════════ //

/**
 * Returns a full history summary for one dataset — all related records.
 */
export async function getDatasetHistory(datasetId) {
  const [cleaned, eda, dashboard, insights, chat, reports] = await Promise.all([
    getCleanedDataset(datasetId),
    getEdaReport(datasetId),
    getDashboard(datasetId),
    getInsights(datasetId),
    getChatHistory(datasetId),
    getPdfReports(datasetId),
  ]);
  return { cleaned, eda, dashboard, insights, chat, reports };
}
