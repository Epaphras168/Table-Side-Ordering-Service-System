import { Router } from 'express';
import { salesReport } from '../services/reportService.js';

export function reportsRouter(db) {
  const router = Router();

  router.get('/sales', (req, res) => {
    res.json(salesReport(db, { from: req.query.from, to: req.query.to }));
  });

  return router;
}
