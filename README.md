# TOSS — Table-Side Ordering & Service System

AUCA SENG 8323 (Software Modeling and Design) course project. TOSS digitizes
the interaction between restaurant waiters, the kitchen and clients: orders
go from a waiter's handheld device to a kitchen display in real time, status
updates flow back as notifications, and the system produces the bill and
records payment.

Design docs live in [`docs/`](docs): [`docs/requirements.md`](docs/requirements.md)
for the functional requirements and [`docs/diagrams/`](docs/diagrams) for the
UML (PlantUML) sources — use case, sequence, class, activity and state
diagrams.

## Stack

- **Server:** Node.js + Express, SQLite (via `better-sqlite3`), with
  WebSocket push for kitchen-display sync landing in build step 3.
- **Client:** React (Vite), three views — waiter tablet, kitchen display,
  manager — behind client-side routing.
- SQLite now, with a path to PostgreSQL later; the schema avoids
  SQLite-only syntax to keep that migration small.

## Repository layout

```
server/    Express API + SQLite schema (server/src/db/schema.sql)
client/    React app (waiter / kitchen / manager views)
docs/      Requirements and PlantUML diagram sources
```

## Running it locally

```bash
cd server && npm install && npm run seed && npm run dev
```

```bash
cd client && npm install && npm run dev
```

The client expects the API at `http://localhost:4000` (override with a
`VITE_API_URL` env var). Open `http://localhost:5173/manager` to manage the
menu.

## Running tests

```bash
cd server && npm test
```

## Build order

This repo is built in the order below (see `docs/requirements.md` for
detail); each step builds on the shared schema in `server/src/db/schema.sql`.

1. **Database schema and menu management** — done. Schema matches
   `docs/diagrams/03_class.puml`; `GET/POST/PUT/DELETE /api/menu` cover FR11.
2. Order placement and table status
3. Kitchen display sync and notifications (WebSockets)
4. Billing, split/merge, payments
5. Authentication, role-based access, logging and reports

Then: unit tests (bill calculation, order state transitions), integration
tests (waiter app ↔ kitchen display sync), edge cases (two waiters editing
the same table, cancellation mid-preparation, network drop), pilot rollout,
staff training, maintenance.

## Rendering the diagrams

```bash
java -jar plantuml.jar -tpng docs/diagrams/*.puml
```

(needs Graphviz installed)
