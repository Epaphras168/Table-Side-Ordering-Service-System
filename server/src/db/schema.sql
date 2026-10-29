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
  active        INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
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

-- Order status follows docs/diagrams/05_state.puml. 'paid' is transient:
-- a fully-settled order is written straight to 'closed' in the same
-- transaction that records the final payment (see billing service), since
-- nothing in the requirements needs a separate "paid but table still
-- occupied" step.
CREATE TABLE IF NOT EXISTS orders (
  order_id   TEXT PRIMARY KEY,
  table_id   TEXT NOT NULL REFERENCES restaurant_tables(table_id),
  waiter_id  TEXT NOT NULL REFERENCES staff(staff_id),
  status     TEXT NOT NULL DEFAULT 'pending'
             CHECK (status IN (
               'pending', 'preparing', 'ready', 'served',
               'bill_requested', 'paid', 'closed', 'cancelled'
             )),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_waiter ON orders(waiter_id);

CREATE TABLE IF NOT EXISTS order_items (
  order_item_id TEXT PRIMARY KEY,
  order_id      TEXT NOT NULL REFERENCES orders(order_id),
  item_id       TEXT NOT NULL REFERENCES menu_items(item_id),
  quantity      INTEGER NOT NULL CHECK (quantity > 0),
  unit_price    REAL NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'preparing', 'ready', 'served', 'cancelled')),
  notes         TEXT
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- A bill covers every eligible order at one table, or at several tables
-- when merged (FR8), so it is keyed to tables/orders through join tables
-- rather than a single order_id.
CREATE TABLE IF NOT EXISTS bills (
  bill_id         TEXT PRIMARY KEY,
  subtotal        REAL NOT NULL,
  tax             REAL NOT NULL,
  service_charge  REAL NOT NULL,
  total           REAL NOT NULL,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid')),
  created_by      TEXT NOT NULL REFERENCES staff(staff_id),
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS bill_tables (
  bill_id  TEXT NOT NULL REFERENCES bills(bill_id),
  table_id TEXT NOT NULL REFERENCES restaurant_tables(table_id),
  PRIMARY KEY (bill_id, table_id)
);

CREATE TABLE IF NOT EXISTS bill_orders (
  bill_id  TEXT NOT NULL REFERENCES bills(bill_id),
  order_id TEXT NOT NULL REFERENCES orders(order_id),
  PRIMARY KEY (bill_id, order_id)
);

-- Even or custom split of a bill into per-guest shares (FR8).
CREATE TABLE IF NOT EXISTS bill_shares (
  share_id TEXT PRIMARY KEY,
  bill_id  TEXT NOT NULL REFERENCES bills(bill_id),
  label    TEXT NOT NULL,
  amount   REAL NOT NULL CHECK (amount >= 0),
  paid     INTEGER NOT NULL DEFAULT 0 CHECK (paid IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_bill_shares_bill ON bill_shares(bill_id);

CREATE TABLE IF NOT EXISTS payments (
  payment_id TEXT PRIMARY KEY,
  bill_id    TEXT NOT NULL REFERENCES bills(bill_id),
  share_id   TEXT REFERENCES bill_shares(share_id),
  method     TEXT NOT NULL CHECK (method IN ('cash', 'card', 'mobile_money')),
  amount     REAL NOT NULL CHECK (amount >= 0),
  recorded_by TEXT NOT NULL REFERENCES staff(staff_id),
  timestamp  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_payments_bill ON payments(bill_id);

CREATE TABLE IF NOT EXISTS notifications (
  notification_id TEXT PRIMARY KEY,
  order_id        TEXT REFERENCES orders(order_id),
  table_id        TEXT REFERENCES restaurant_tables(table_id),
  type            TEXT NOT NULL CHECK (type IN ('order_ready', 'urgent_alert', 'cancellation')),
  message         TEXT NOT NULL,
  raised_by       TEXT REFERENCES staff(staff_id),
  timestamp       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_timestamp ON notifications(timestamp);
