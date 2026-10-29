import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from '../middleware/auth.js';
import { generateBill, getBill, getOpenBillForTable, splitBill } from '../services/billService.js';
import { recordPayment } from '../services/paymentService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const generateSchema = z.object({ tableIds: z.array(z.string().min(1)).min(1) });
const splitSchema = z.object({
  parts: z.number().int().min(2).optional(),
  amounts: z.array(z.number().positive()).optional(),
  labels: z.array(z.string()).optional(),
});
const paymentSchema = z.object({
  shareId: z.string().optional(),
  method: z.enum(['cash', 'card', 'mobile_money']),
  amount: z.number().positive(),
});

// FR8/FR9/FR10: itemized billing (with split/merge) and payment.
export function billsRouter(db, broadcast) {
  const router = Router();

  router.get(
    '/table/:tableId/open',
    asyncHandler(async (req, res) => {
      res.json(getOpenBillForTable(db, req.params.tableId));
    })
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      res.json(getBill(db, req.params.id));
    })
  );

  router.post(
    '/',
    requireRole('waiter', 'manager'),
    asyncHandler(async (req, res) => {
      const { tableIds } = generateSchema.parse(req.body);
      const bill = generateBill(db, { tableIds, createdBy: req.user.staffId });
      broadcast('bill:updated', bill, { roles: ['manager', 'waiter'] });
      res.status(201).json(bill);
    })
  );

  router.post(
    '/:id/split',
    requireRole('waiter', 'manager'),
    asyncHandler(async (req, res) => {
      const body = splitSchema.parse(req.body);
      const bill = splitBill(db, req.params.id, body);
      broadcast('bill:updated', bill, { roles: ['manager', 'waiter'] });
      res.json(bill);
    })
  );

  router.post(
    '/:id/payments',
    requireRole('waiter', 'manager'),
    asyncHandler(async (req, res) => {
      const body = paymentSchema.parse(req.body);
      const bill = recordPayment(db, req.params.id, { ...body, recordedBy: req.user.staffId });
      broadcast('bill:updated', bill, { roles: ['manager', 'waiter'] });
      if (bill.status === 'paid') {
        broadcast('table:freed', { tables: bill.tables }, { roles: ['manager', 'waiter', 'kitchen'] });
      }
      res.status(201).json(bill);
    })
  );

  return router;
}
