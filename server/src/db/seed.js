import { randomUUID } from 'node:crypto';
import { openDb } from './index.js';

const db = openDb();

const menuCount = db.prepare('SELECT COUNT(*) AS n FROM menu_items').get().n;
if (menuCount === 0) {
  const insert = db.prepare(
    'INSERT INTO menu_items (item_id, name, category, price, available) VALUES (?, ?, ?, ?, 1)'
  );
  const items = [
    ['Grilled Tilapia', 'Main', 8500],
    ['Beef Brochettes', 'Main', 4000],
    ['Chips & Sausage', 'Main', 3500],
    ['Avocado Salad', 'Starter', 2000],
    ['Samosa (3pc)', 'Starter', 1500],
    ['Fresh Juice', 'Beverage', 2500],
    ['Rwandan Coffee', 'Beverage', 1800],
    ['Mandazi (2pc)', 'Dessert', 1000],
  ];
  for (const [name, category, price] of items) {
    insert.run(randomUUID(), name, category, price);
  }
  console.log(`Seeded ${items.length} menu items.`);
} else {
  console.log('Menu already has data, skipping seed.');
}

db.close();
