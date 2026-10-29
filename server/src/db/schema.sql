-- TOSS database schema, matching docs/diagrams/03_class.puml.
-- SQLite now; the schema avoids SQLite-only syntax so it moves to
-- PostgreSQL later with minimal changes.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS staff (
  staff_id      TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('waiter', 'kitchen', 'manager')),
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS restaurant_tables (
  table_id   TEXT PRIMARY KEY,
  number     INTEGER NOT NULL UNIQUE,
  capacity   INTEGER NOT NULL,
  status     TEXT NOT NULL DEFAULT 'empty'
             CHECK (status IN ('empty', 'occupied', 'awaiting_order', 'awaiting_bill'))
);

CREATE TABLE IF NOT EXISTS menu_items (
  item_id    TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  category   TEXT NOT NULL,
  price      REAL NOT NULL CHECK (price >= 0),
  available  INTEGER NOT NULL DEFAULT 1 CHECK (available IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);

CREATE TABLE IF NOT EXISTS orders (
  order_id   TEXT PRIMARY KEY,
  table_id   TEXT NOT NULL REFERENCES restaurant_tables(table_id),
  waiter_id  TEXT NOT NULL REFERENCES staff(staff_id),
  status     TEXT NOT NULL DEFAULT 'pending'
             CHECK (status IN (
               'pending', 'preparing', 'ready', 'served',
               'bill_requested', 'paid', 'closed', 'cancelled'
             )),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_id);

CREATE TABLE IF NOT EXISTS order_items (
  order_item_id TEXT PRIMARY KEY,
  order_id      TEXT NOT NULL REFERENCES orders(order_id),
  item_id       TEXT NOT NULL REFERENCES menu_items(item_id),
  quantity      INTEGER NOT NULL CHECK (quantity > 0),
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'preparing', 'ready', 'served', 'cancelled')),
  notes         TEXT
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS bills (
  bill_id         TEXT PRIMARY KEY,
  order_id        TEXT NOT NULL REFERENCES orders(order_id),
  subtotal        REAL NOT NULL,
  tax             REAL NOT NULL,
  service_charge  REAL NOT NULL,
  total           REAL NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS payments (
  payment_id TEXT PRIMARY KEY,
  bill_id    TEXT NOT NULL REFERENCES bills(bill_id),
  method     TEXT NOT NULL CHECK (method IN ('cash', 'card', 'mobile_money')),
  amount     REAL NOT NULL CHECK (amount >= 0),
  timestamp  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  notification_id TEXT PRIMARY KEY,
  order_id        TEXT REFERENCES orders(order_id),
  type            TEXT NOT NULL CHECK (type IN ('order_ready', 'urgent_alert', 'cancellation')),
  message         TEXT NOT NULL,
  timestamp       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
