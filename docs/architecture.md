# TOSS — Architecture notes

This records the implementation decisions behind the diagrams in
`docs/diagrams/`, for anything that isn't obvious from the code alone.

## Layering

```
client/src/
  api/          thin fetch wrappers, one module per resource
  context/      AuthContext, RealtimeContext (WebSocket), ToastContext
  components/   reusable UI (layout, primitives) — no business logic
  views/        one folder per role (waiter/kitchen/manager), each
                composed from small, single-purpose components

server/src/
  routes/       HTTP verbs + validation (zod) + RBAC — thin
  services/     business rules and the state machine — all here
  realtime/     WebSocket server, role/staff-scoped broadcast
  middleware/   auth (JWT), error handling
  db/           schema.sql, seed.js
```

Routes never touch SQL directly and services never touch `req`/`res` — this
is what makes the service layer unit-testable without an HTTP server (see
`server/test/`), and is why `createApp(db, { broadcast })` takes the
database and the realtime broadcaster as injected dependencies rather than
importing singletons.

## Authentication & authorization

- Passwords are hashed with `bcryptjs`; nothing but the hash is stored.
- `POST /api/auth/login` issues a JWT (`jsonwebtoken`) carrying `staffId`,
  `role`, and `name`. The client stores it in `localStorage` and sends it
  as `Authorization: Bearer <token>` (REST) or `?token=` (WebSocket, since
  browsers can't set headers on the WS handshake).
- `requireAuth` verifies the token; `requireRole(...roles)` gates specific
  routes. Every route is authenticated by default (`app.use('/api',
  requireAuth)` runs before any resource router except `/api/auth` and
  `/api/health`), so a new route is locked down unless explicitly opened up.
- `config.js` refuses to boot with the default JWT secret when
  `NODE_ENV=production`, so a real deployment can't silently run insecure.

## Order state machine

`services/orderService.js` enforces `05_state.puml` with an explicit
transition table (`pending → preparing → ready → served`, cancellable from
`pending`/`preparing`) rather than letting any route set any status. Order
items can only be added/removed/requantified while the order is `pending`
(FR3 — "before submitting it to the kitchen" is read as "before the kitchen
has accepted it", since the order is already visible to the kitchen the
moment it's placed, per FR4 and `02_sequence.puml`).

## Billing model

The original class diagram had `Order "1" -- "0..1" Bill`. That doesn't
survive contact with FR8 ("bills can be split or merged per table"): a
merge needs one bill to cover orders from several tables, and a split
needs one bill divided into several payable pieces. The implemented model
(see `03_class.puml` for the diagram and `server/src/db/schema.sql` for the
tables):

- `Bill` is linked to one or more tables (`bill_tables`) and one or more
  orders (`bill_orders`) — generating a bill for several tables *is* the
  merge operation, not a separate endpoint.
- Splitting a bill creates `BillShare` rows (even split or custom amounts)
  instead of separate child bills, so each share is paid independently via
  `POST /api/bills/:id/payments` with a `shareId`.
- A bill is "open" until every share (or the full total, if never split) is
  paid, at which point the service closes every linked order and frees
  every linked table in one transaction — this is the `Paid → Closed`
  transition in `05_state.puml`, collapsed into a single step because
  nothing in the requirements needs a separate "paid but table still
  occupied" state.

## Real-time layer

A single `WebSocketServer` on `/ws` (see `server/src/realtime/ws.js`)
authenticates each connection with the same JWT as the REST API, tags the
socket with `{ staffId, role }`, and exposes one `broadcast(event, payload,
{ roles?, staffId? })` function threaded into the routers that need to push
(`orders`, `notifications`, `bills`). Events used by the client:

| Event | Who gets it | Why |
|---|---|---|
| `order:new` / `order:updated` / `order:status` / `order:cancelled` | kitchen, manager, waiter | kitchen display and table view sync without polling |
| `notification:order_ready` | the order's waiter + manager | FR6 |
| `notification:urgent_alert` | kitchen, manager | FR7 |
| `notification:cancellation` | kitchen, manager | FR14 audit trail |
| `bill:updated` / `table:freed` | manager, waiter (+ kitchen for `table:freed`) | billing/payment UI sync |

The client (`RealtimeContext`) auto-reconnects with backoff and exposes a
`subscribe(event, handler)` hook so views don't manage sockets directly.

## UI design system

Plain CSS with design tokens (`client/src/styles/tokens.css`) rather than a
component framework, so the three views can diverge where it matters: the
Kitchen Display opts into a dark theme (`[data-theme="dark"]` on the app
shell) for a bright, hot kitchen environment, while Waiter and Manager stay
light. Everything else (buttons, badges, cards, forms, tables, modals,
toasts) is one shared set of primitives in `styles/components.css`, so the
three role-specific UIs read as one product.

## Known gaps in this prototype

- No refresh-token rotation — the JWT simply expires (`JWT_EXPIRES_IN`,
  default 12h) and the user re-authenticates.
- Mobile money is modeled as a payment `method` enum value, not integrated
  with an actual provider (MTN/Airtel Mobile Money API) — there's no
  requirement yet specifying which gateway to use.
- SQLite is file-based; moving to PostgreSQL (per the original plan) is a
  driver swap in `server/src/db/index.js` plus minor SQL dialect fixes
  (the schema was written to avoid SQLite-only syntax where practical).
