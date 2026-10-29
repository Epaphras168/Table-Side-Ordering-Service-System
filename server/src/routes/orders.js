import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from '../middleware/auth.js';
import {
  acceptOrder,
  addOrderItem,
  cancelOrder,
  getOrderWithItems,
  listOrders,
  markOrderReady,
  placeOrder,
  removeOrderItem,
  serveOrder,
  updateOrderItemQuantity,
} from '../services/orderService.js';
import { createNotification } from '../services/notificationService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest } from '../utils/httpError.js';

const placeOrderSchema = z.object({
  tableId: z.string().min(1),
  items: z
    .array(
      z.object({
        itemId: z.string().min(1),
        quantity: z.number().int().positive(),
        notes: z.string().optional(),
      })
    )
    .min(1),
});

const addItemSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().positive(),
  notes: z.string().optional(),
});

const quantitySchema = z.object({ quantity: z.number().int().positive() });
const cancelSchema = z.object({ confirm: z.literal(true), reason: z.string().optional() });

export function ordersRouter(db, broadcast) {
  const router = Router();

  router.get('/', (req, res) => {
    const { tableId, status } = req.query;
    const statuses = status ? String(status).split(',') : undefined;
    res.json(listOrders(db, { tableId, statuses }));
  });

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      res.json(getOrderWithItems(db, req.params.id));
    })
  );

  router.post(
    '/',
    requireRole('waiter', 'manager'),
    asyncHandler(async (req, res) => {
      const body = placeOrderSchema.parse(req.body);
      const order = placeOrder(db, { ...body, waiterId: req.user.staffId });
      broadcast('order:new', order, { roles: ['kitchen', 'manager'] });
      res.status(201).json(order);
    })
  );

  router.post(
    '/:id/items',
    requireRole('waiter', 'manager'),
    asyncHandler(async (req, res) => {
      const body = addItemSchema.parse(req.body);
      const order = addOrderItem(db, req.params.id, body);
      broadcast('order:updated', order, { roles: ['kitchen', 'manager'] });
      res.json(order);
    })
  );

  router.put(
    '/:id/items/:itemId',
    requireRole('waiter', 'manager'),
    asyncHandler(async (req, res) => {
      const { quantity } = quantitySchema.parse(req.body);
      const order = updateOrderItemQuantity(db, req.params.id, req.params.itemId, quantity);
      broadcast('order:updated', order, { roles: ['kitchen', 'manager'] });
      res.json(order);
    })
  );

  router.delete(
    '/:id/items/:itemId',
    requireRole('waiter', 'manager'),
    asyncHandler(async (req, res) => {
      const order = removeOrderItem(db, req.params.id, req.params.itemId);
      broadcast('order:updated', order, { roles: ['kitchen', 'manager'] });
      res.json(order);
    })
  );

  router.post(
    '/:id/accept',
    requireRole('kitchen', 'manager'),
    asyncHandler(async (req, res) => {
      const order = acceptOrder(db, req.params.id);
      broadcast('order:status', order, { roles: ['kitchen', 'manager', 'waiter'] });
      res.json(order);
    })
  );

  router.post(
    '/:id/ready',
    requireRole('kitchen', 'manager'),
    asyncHandler(async (req, res) => {
      const order = markOrderReady(db, req.params.id);
      const notification = createNotification(db, {
        orderId: order.order_id,
        tableId: order.table_id,
        type: 'order_ready',
        message: `Order for table ${order.table_id} is ready to serve`,
        raisedBy: req.user.staffId,
      });
      broadcast('order:status', order, { roles: ['kitchen', 'manager', 'waiter'] });
      broadcast('notification:order_ready', { ...notification, order }, { staffId: order.waiter_id });
      broadcast('notification:order_ready', { ...notification, order }, { roles: ['manager'] });
      res.json(order);
    })
  );

  router.post(
    '/:id/serve',
    requireRole('waiter', 'manager'),
    asyncHandler(async (req, res) => {
      const order = serveOrder(db, req.params.id);
      broadcast('order:status', order, { roles: ['kitchen', 'manager', 'waiter'] });
      res.json(order);
    })
  );

  router.post(
    '/:id/cancel',
    requireRole('waiter', 'manager'),
    asyncHandler(async (req, res) => {
      const parsed = cancelSchema.safeParse(req.body);
      if (!parsed.success) throw badRequest('Cancellation requires { confirm: true }');
      const order = cancelOrder(db, req.params.id);
      const notification = createNotification(db, {
        orderId: order.order_id,
        tableId: order.table_id,
        type: 'cancellation',
        message: parsed.data.reason
          ? `Order cancelled: ${parsed.data.reason}`
          : 'Order cancelled by staff',
        raisedBy: req.user.staffId,
      });
      broadcast('order:cancelled', order, { roles: ['kitchen', 'manager', 'waiter'] });
      broadcast('notification:cancellation', { ...notification, order }, { roles: ['kitchen', 'manager'] });
      res.json(order);
    })
  );

  return router;
}
