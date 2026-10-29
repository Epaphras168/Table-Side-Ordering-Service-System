# TOSS — Table-Side Ordering & Service System

AUCA SENG 8323 (Software Modeling and Design) course project. TOSS digitizes
the interaction between restaurant waiters, the kitchen and clients: orders
go from a waiter's handheld device to a kitchen display in real time, status
updates flow back as notifications, and the system produces the bill and
records payment — cash, card, or mobile money.

This is a complete, working prototype covering all 14 functional
requirements: authentication & role-based access, table management, menu
management, order placement/modification/cancellation, real-time kitchen
sync, urgent alerts, itemized billing with split/merge, payments, staff
management, and sales reporting.

Design docs live in [`docs/`](docs): [`docs/requirements.md`](docs/requirements.md)
for the functional requirements, [`docs/architecture.md`](docs/architecture.md)
for the implementation decisions, and [`docs/diagrams/`](docs/diagrams) for the
UML (PlantUML) sources — use case, sequence, class, activity and state diagrams.

## Stack

- **Server:** Node.js + Express, SQLite (`better-sqlite3`), JWT auth
  (`jsonwebtoken` + `bcryptjs`), WebSocket push (`ws`) for real-time kitchen
  sync, request validation with `zod`.
- **Client:** React 19 (Vite), React Router, three role-based views —
  waiter, kitchen display, manager — sharing one design system.
- SQLite now, with a path to PostgreSQL later; the schema avoids
  SQLite-only syntax to keep that migration small.

## Repository layout

```
server/    Express API, SQLite schema & services (server/src/db/schema.sql)
client/    React app — waiter / kitchen / manager views
docs/      Requirements, architecture notes, PlantUML diagram sources
```

## Running it locally

```bash
cd server
npm install
npm run seed   # creates demo staff accounts, tables and a menu
npm run dev
```

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173` and sign in. The seed script creates three
demo accounts, all with password `ChangeMe123!`:

| Username   | Role    |
|------------|---------|
| `manager`  | manager |
| `waiter1`  | waiter  |
| `kitchen1` | kitchen |

**Change these before using this anywhere real.** The manager account can
create/deactivate staff accounts from the Staff tab once signed in.

The client expects the API at `http://localhost:4000` (override with a
`VITE_API_URL` env var). The server's defaults (also overridable via env
vars) are in `server/src/config.js`: `JWT_SECRET`, `JWT_EXPIRES_IN`,
`TAX_RATE` (18%), `SERVICE_CHARGE_RATE` (10%). Running with `NODE_ENV=production`
and the default `JWT_SECRET` refuses to start.

## Running tests

```bash
cd server && npm test   # 35 tests: auth, RBAC, order state machine,
                         # billing/split/merge, payments, menu, tables, reports
```

The client was additionally verified with an end-to-end Playwright pass
covering: login for all three roles, placing an order, real-time sync to
the kitchen display, accepting/readying/serving, requesting and paying a
bill (table freed), an urgent alert reaching the kitchen live, and
cancelling an order with explicit confirmation.

## Functional requirements coverage

All 14 FRs from `docs/requirements.md` are implemented. In short:

| Module | Where |
|---|---|
| Authentication & roles (FR13) | `server/src/middleware/auth.js`, `client/src/context/AuthContext.jsx` |
| Table management (FR1) | `server/src/services/tableService.js`, `client/src/views/manager/TablesTab.jsx` |
| Menu management (FR2, FR11) | `server/src/services/menu*`, `client/src/views/manager/MenuTab.jsx` |
| Order placement/modify/cancel (FR3–6, FR14) | `server/src/services/orderService.js`, `client/src/views/waiter/*` |
| Kitchen display (FR5) | `server/src/realtime/ws.js`, `client/src/views/kitchen/*` |
| Urgent alerts (FR7) | `server/src/services/notificationService.js` |
| Billing, split/merge (FR8, FR9) | `server/src/services/billService.js`, `client/src/views/waiter/BillPanel.jsx` |
| Payments (FR10) | `server/src/services/paymentService.js` |
| Staff management (FR13) | `server/src/services/staffService.js`, `client/src/views/manager/StaffTab.jsx` |
| Logging & reports (FR12) | `server/src/services/reportService.js`, `client/src/views/manager/ReportsTab.jsx` |

## Rendering the diagrams

```bash
java -jar plantuml.jar -tpng docs/diagrams/*.puml
```

(needs Graphviz installed)
