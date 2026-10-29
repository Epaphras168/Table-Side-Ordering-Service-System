import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from '../middleware/auth.js';
import {
  createTable,
  deleteTable,
  getTable,
  listTables,
  seatTable,
  updateTable,
} from '../services/tableService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const createSchema = z.object({
  number: z.number().int().positive(),
  capacity: z.number().int().positive(),
});
const updateSchema = createSchema.partial();

// FR1: table status for the waiter floor plan.
export function tablesRouter(db) {
  const router = Router();

  router.get('/', (req, res) => {
    res.json(listTables(db));
  });

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const table = getTable(db, req.params.id);
      res.json(table);
    })
  );

  router.post(
    '/:id/seat',
    requireRole('waiter', 'manager'),
    asyncHandler(async (req, res) => {
      res.json(seatTable(db, req.params.id));
    })
  );

  router.post(
    '/',
    requireRole('manager'),
    asyncHandler(async (req, res) => {
      const body = createSchema.parse(req.body);
      res.status(201).json(createTable(db, body));
    })
  );

  router.put(
    '/:id',
    requireRole('manager'),
    asyncHandler(async (req, res) => {
      const body = updateSchema.parse(req.body);
      res.json(updateTable(db, req.params.id, body));
    })
  );

  router.delete(
    '/:id',
    requireRole('manager'),
    asyncHandler(async (req, res) => {
      deleteTable(db, req.params.id);
      res.status(204).end();
    })
  );

  return router;
}
