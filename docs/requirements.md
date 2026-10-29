# TOSS — Requirements

AUCA SENG 8323 (Software Modeling and Design). This document is the authoritative
requirements list for TOSS, kept in sync with the diagrams in `docs/diagrams/`.

## Actors

- **Waiter** — takes orders table-side, serves, handles bills/payments, raises alerts.
- **Kitchen Staff** — receives orders on the kitchen display, updates preparation status.
- **Manager** — manages the menu, staff accounts, reports, and can cancel orders.

Note: an earlier draft of the diagrams included a **Cashier/POS** actor for
`Generate Bill` / `Process Payment`. It was dropped: FR13 defines only three
roles (waiter, kitchen, manager), and the sequence diagram already has the
waiter handling payment table-side, which matches how TOSS is meant to work.
If a dedicated cashier role is needed later, add it as a requirement first,
then back it in the diagrams and the `staff.role` enum.

## Functional requirements

1. Waiter selects a table and views its status (empty, occupied, awaiting order, awaiting bill)
2. Waiter browses the menu by category and adds items to an order
3. Waiter modifies an order (add/remove/change quantity) before submitting it to the kitchen
4. Confirmed orders are sent to the kitchen display in real time
5. Kitchen staff update order status (received, preparing, ready)
6. Waiter is notified when an order is ready to serve
7. Waiter can send an urgent alert (e.g. guest needs assistance, delayed order)
8. Bills can be split or merged per table
9. Itemized bill with tax and service charge
10. Payment by cash, card or mobile money
11. Manager adds, edits and removes menu items and prices
12. Orders, transactions and notifications are logged with timestamps for reporting
13. Authentication and role-based access (waiter, kitchen, manager)
14. **(new)** A waiter or manager can cancel an order before it is ready, with
    explicit confirmation. Cancellation is only allowed while the order is
    `Pending` or `Preparing` (see `05_state.puml`); once `Ready` or later it
    must be handled manually (e.g. void after serving), not through this
    use case.

## Gaps closed in this pass

- **FR14 added** (order cancellation) — was present in the state diagram
  (`Pending`/`Preparing` → `Cancelled`) but missing from requirements, use
  case, sequence and activity diagrams. Now covered everywhere:
  `01_usecase.puml` (UC17), `02c_sequence_cancel_order.puml`,
  `04_activity.puml` (cancellation branch), `03_class.puml`
  (`Order.cancel()`, `Waiter.cancelOrder()`, `Manager.cancelOrder()`).
- **Urgent alert** (FR7) — was only in the use case and class diagrams. Added
  `02b_sequence_urgent_alert.puml` and a parallel branch in
  `04_activity.puml`.
- **Cashier/POS actor** — dropped from `01_usecase.puml` (see note above)
  rather than adding a requirement, since the role list in FR13 and the
  `Staff` generalization in the class diagram only ever defined three roles.

## Build order

1. Database schema and menu management *(this change)*
2. Order placement and table status
3. Kitchen display sync and notifications
4. Billing, split/merge, payments
5. Authentication, role-based access, logging and reports

Then: unit tests (bill calculation, order state transitions), integration
tests (waiter app ↔ kitchen display sync), edge cases (two waiters editing
the same table, cancellation mid-preparation, network drop), pilot rollout,
staff training, maintenance.
