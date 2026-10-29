import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { openDb } from './index.js';

const db = openDb();

function seedStaff() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM staff').get().n;
  if (count > 0) {
    console.log('Staff already seeded, skipping.');
    return;
  }
  const insert = db.prepare(
    'INSERT INTO staff (staff_id, name, role, username, password_hash) VALUES (?, ?, ?, ?, ?)'
  );
  const accounts = [
    ['Epa Manager', 'manager', 'manager', 'ChangeMe123!'],
    ['Alice Waiter', 'waiter', 'waiter1', 'ChangeMe123!'],
    ['Bob Kitchen', 'kitchen', 'kitchen1', 'ChangeMe123!'],
  ];
  for (const [name, role, username, password] of accounts) {
    insert.run(randomUUID(), name, role, username, bcrypt.hashSync(password, 10));
  }
  console.log(`Seeded ${accounts.length} staff accounts (default password: ChangeMe123!).`);
}

function seedTables() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM restaurant_tables').get().n;
  if (count > 0) {
    console.log('Tables already seeded, skipping.');
    return;
  }
  const insert = db.prepare(
    'INSERT INTO restaurant_tables (table_id, number, capacity) VALUES (?, ?, ?)'
  );
  for (let number = 1; number <= 10; number += 1) {
    insert.run(randomUUID(), number, number % 3 === 0 ? 6 : 4);
  }
  console.log('Seeded 10 tables.');
}

function seedMenu() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM menu_items').get().n;
  if (count > 0) {
    console.log('Menu already seeded, skipping.');
    return;
  }
  const insert = db.prepare(
    'INSERT INTO menu_items (item_id, name, category, price, available) VALUES (?, ?, ?, ?, 1)'
  );
  const items = [
    ['Grilled Tilapia', 'Main', 8500],
    ['Beef Brochettes', 'Main', 4000],
    ['Chips & Sausage', 'Main', 3500],
    ['Chicken Pilau', 'Main', 5000],
    ['Avocado Salad', 'Starter', 2000],
    ['Samosa (3pc)', 'Starter', 1500],
    ['Fresh Juice', 'Beverage', 2500],
    ['Rwandan Coffee', 'Beverage', 1800],
    ['Still Water', 'Beverage', 1000],
    ['Mandazi (2pc)', 'Dessert', 1000],
    ['Fruit Platter', 'Dessert', 2500],
  ];
  for (const [name, category, price] of items) {
    insert.run(randomUUID(), name, category, price);
  }
  console.log(`Seeded ${items.length} menu items.`);
}

seedStaff();
seedTables();
seedMenu();
db.close();
