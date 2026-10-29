import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { requireRole } from '../middleware/auth.js';

function serialize(row) {
  return { ...row, available: !!row.available };
}

// FR11: manager adds, edits and removes menu items and prices.
export function menuRouter(db) {
  const router = Router();

  router.get('/', (req, res) => {
    const { category } = req.query;
    const rows = category
      ? db.prepare('SELECT * FROM menu_items WHERE category = ? ORDER BY name').all(category)
      : db.prepare('SELECT * FROM menu_items ORDER BY category, name').all();
    res.json(rows.map(serialize));
  });

  router.get('/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM menu_items WHERE item_id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Menu item not found' });
    res.json(serialize(row));
  });

  router.post('/', requireRole('manager'), (req, res) => {
    const { name, category, price, available = true } = req.body ?? {};
    if (!name || !category || typeof price !== 'number' || price < 0) {
      return res.status(400).json({ error: 'name, category and a non-negative price are required' });
    }
    const itemId = randomUUID();
    db.prepare(
      'INSERT INTO menu_items (item_id, name, category, price, available) VALUES (?, ?, ?, ?, ?)'
    ).run(itemId, name, category, price, available ? 1 : 0);
    const row = db.prepare('SELECT * FROM menu_items WHERE item_id = ?').get(itemId);
    res.status(201).json(serialize(row));
  });

  router.put('/:id', requireRole('manager'), (req, res) => {
    const existing = db.prepare('SELECT * FROM menu_items WHERE item_id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Menu item not found' });

    const { name, category, price, available } = req.body ?? {};
    if (price !== undefined && (typeof price !== 'number' || price < 0)) {
      return res.status(400).json({ error: 'price must be a non-negative number' });
    }

    db.prepare(
      `UPDATE menu_items
       SET name = ?, category = ?, price = ?, available = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE item_id = ?`
    ).run(
      name ?? existing.name,
      category ?? existing.category,
      price ?? existing.price,
      available === undefined ? existing.available : (available ? 1 : 0),
      req.params.id
    );
    const row = db.prepare('SELECT * FROM menu_items WHERE item_id = ?').get(req.params.id);
    res.json(serialize(row));
  });

  // Removing a menu item that is already referenced by an order would
  // corrupt order history, so it is disabled (available = 0) instead of
  // deleted. An item never ordered is deleted outright.
  router.delete('/:id', requireRole('manager'), (req, res) => {
    const existing = db.prepare('SELECT * FROM menu_items WHERE item_id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Menu item not found' });

    const referenced = db
      .prepare('SELECT 1 FROM order_items WHERE item_id = ? LIMIT 1')
      .get(req.params.id);

    if (referenced) {
      db.prepare(
        `UPDATE menu_items SET available = 0, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE item_id = ?`
      ).run(req.params.id);
      return res.json({ item_id: req.params.id, removed: false, disabled: true });
    }

    db.prepare('DELETE FROM menu_items WHERE item_id = ?').run(req.params.id);
    res.json({ item_id: req.params.id, removed: true, disabled: false });
  });

  return router;
}
