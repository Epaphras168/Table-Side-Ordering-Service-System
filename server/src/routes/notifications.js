import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from '../middleware/auth.js';
import { createNotification, listNotifications } from '../services/notificationService.js';
import { getTable } from '../services/tableService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const alertSchema = z.object({
  tableId: z.string().min(1),
  message: z.string().min(1),
});

// FR7: waiter raises an urgent alert (guest needs assistance, delayed order).
export function notificationsRouter(db, broadcast) {
  const router = Router();

  router.get('/', (req, res) => {
    res.json(listNotifications(db, { limit: Number(req.query.limit) || 100 }));
  });

  router.post(
    '/urgent-alert',
    requireRole('waiter', 'manager'),
    asyncHandler(async (req, res) => {
      const { tableId, message } = alertSchema.parse(req.body);
      const table = getTable(db, tableId);
      const notification = createNotification(db, {
        tableId: table.table_id,
        type: 'urgent_alert',
        message,
        raisedBy: req.user.staffId,
      });
      broadcast('notification:urgent_alert', { ...notification, tableNumber: table.number }, {
        roles: ['kitchen', 'manager'],
      });
      res.status(201).json(notification);
    })
  );

  return router;
}
