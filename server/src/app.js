import cors from 'cors';
import express from 'express';
import { requireAuth, requireRole } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.js';
import { billsRouter } from './routes/bills.js';
import { menuRouter } from './routes/menu.js';
import { notificationsRouter } from './routes/notifications.js';
import { ordersRouter } from './routes/orders.js';
import { reportsRouter } from './routes/reports.js';
import { staffRouter } from './routes/staff.js';
import { tablesRouter } from './routes/tables.js';

export function createApp(db, { broadcast } = { broadcast: () => {} }) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRouter(db));

  app.use('/api', requireAuth);

  app.use('/api/menu', menuRouter(db));
  app.use('/api/staff', requireRole('manager'), staffRouter(db));
  app.use('/api/tables', tablesRouter(db));
  app.use('/api/orders', ordersRouter(db, broadcast));
  app.use('/api/notifications', notificationsRouter(db, broadcast));
  app.use('/api/bills', billsRouter(db, broadcast));
  app.use('/api/reports', requireRole('manager'), reportsRouter(db));

  app.use(errorHandler);
  return app;
}
