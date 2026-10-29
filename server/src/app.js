import cors from 'cors';
import express from 'express';
import { menuRouter } from './routes/menu.js';

export function createApp(db) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.use('/api/menu', menuRouter(db));

  return app;
}
