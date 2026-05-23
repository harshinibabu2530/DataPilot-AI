/**
 * history.js — GET /api/history
 *
 * Returns the authenticated user's past datasets with all linked records.
 * GET /api/history              → list all datasets for the current user
 * GET /api/history/:dataset_id  → full detail for one dataset
 */
import { Router } from 'express';
import { getUserDatasets, getDatasetHistory, deleteDataset } from '../services/db.js';

const router = Router();

// List all datasets for the current user
router.get('/', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated.' });
    const datasets = await getUserDatasets(req.user.id);
    return res.json({ datasets, count: datasets.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Full detail for one dataset
router.get('/:dataset_id', async (req, res) => {
  try {
    const { dataset_id } = req.params;
    const history = await getDatasetHistory(dataset_id);
    return res.json(history);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete a dataset and all associated records (cascade delete)
router.delete('/:dataset_id', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated.' });
    const { dataset_id } = req.params;
    const deleted = await deleteDataset(req.user.id, dataset_id);
    if (!deleted) {
      return res.status(404).json({ error: 'Dataset not found or does not belong to you.' });
    }
    return res.json({ success: true, message: 'Dataset deleted successfully.', dataset: deleted });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
