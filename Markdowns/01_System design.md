# SYSTEM_DESIGN.md
## Enterprise ERP — Complete Architecture Specification
### Stack: React 18 + Vite + Tailwind + Zustand + TanStack Query + Socket.io | Node.js + Express + Sequelize + MySQL + JWT

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                   │
│                                                                             │
│   [Admin Shell]    [Sales Manager Shell]  [Inventory Shell]  [DW Shell]    │
│   Full system       Orders, Parties,       Stock, Inward,     Challans,    │
│   visibility        Payments, Flags        Reorder, Prices    Dispatch     │
│                                                                             │
│              Single React 18 + Vite Build (role-gated routing)             │
│       Zustand (auth/ui state) · TanStack Query (server/cache state)        │
│              Axios (REST) · Socket.io-client (real-time events)            │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │ HTTPS + WSS
┌──────────────────────────────────▼──────────────────────────────────────────┐
│                         NGINX REVERSE PROXY                                 │
│              SSL termination · Static asset serving · Rate limiting        │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────────────┐
│                       EXPRESS.JS API GATEWAY                                │
│                                                                             │
│  Helmet → CORS → Body Parser → Rate Limiter → JWT Auth → RBAC Guard        │
│  → Request Validator → Audit Interceptor → Controller → Service            │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                        SERVICE / DOMAIN LAYER                               │
│                                                                             │
│  AuthSvc │ UserSvc │ RegionSvc │ PartySvc │ ProductSvc │ PriceSvc          │
│  StockSvc │ InwardSvc │ OrderSvc │ ChallanSvc │ DispatchSvc                │
│  PaymentSvc │ ReorderSvc │ SuggestionSvc │ NotificationSvc                 │
│  AuditSvc │ ImportSvc │ ExportSvc │ PdfSvc                                 │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                   Sequelize ORM → MySQL 8.x                                 │
└─────────────────────────────────────────────────────────────────────────────┘
         ▲                                              ▲
         │                                              │
┌────────┴────────┐                        ┌────────────┴──────────┐
│ Socket.io Server│◄──── room events ─────►│   Cron Job Scheduler  │
│  Rooms:         │                        │  - Stock threshold    │
│  role:admin     │                        │  - Credit limit sweep │
│  role:im        │                        │  - Session cleanup    │
│  role:sm        │                        │  - Suggestion refresh │
│  user:{id}      │                        └───────────────────────┘
└─────────────────┘
```

### Architectural Principles

**Single source of truth for permissions.** Every UI affordance (sidebar item, button, route, API endpoint) is governed by a permission object returned at login time. The frontend never hardcodes role-based visibility — it reads the permission map. The backend enforces the same matrix as middleware, independently of the frontend.

**Stateless REST, stateful sockets.** Every REST call carries a JWT. Socket.io connections authenticate once at handshake and join named rooms (role-scoped and user-scoped). Real-time notifications and stock alerts flow over sockets; data mutations always go through REST first, then broadcast the delta via socket.

**Service layer owns all business rules.** Controllers are thin: parse → call service → respond. All cross-cutting logic (stock reservation, credit checks, reorder flag auto-updates, audit writes, notification dispatch) lives in service classes so it is reachable from REST handlers, socket handlers, and cron jobs identically.

**Audit is a side-effect, not a feature.** Every state-mutating service method is wrapped by an audit interceptor that captures before/after state without requiring the developer to remember to call it. The audit table is append-only — the DB application user has no UPDATE or DELETE grants on it.

**Stock1/Stock2 is an operational transition, not a permanent dual-warehouse model.** Once Stock1 reaches zero for a product, dual tracking ends permanently for that product. The combined view is always surfaced to SM. The split view is only for Admin and IM.

---

## 2. Module Dependency Graph

```
Auth & Access Control
  └── User & Region Management
        └── Party Management ─────────────────────────────────┐
              └── Product Catalogue & Pricing                  │
                    └── Inventory (Stock1/Stock2)              │
                          └── Inward Stock Entry              │
                          └── Reorder List ──────────────┐   │
                                └── Orders & Challan ←───┘   │
                                      ├── SM Selling Price    │
                                      ├── Smart Suggestions ←─┘
                                      ├── Dispatch
                                      └── Payment Tracking
                                            └── Notifications (cross-cutting)
                                            └── Audit Logs (cross-cutting)
                                            └── Excel Import/Export (cross-cutting)
                                            └── PDF Generation (cross-cutting)
```

**Dependency rules:**

- Nothing depends backward into Auth — it is the root.
- Orders cannot exist without Party, Product, and Inventory data.
- Dispatch and Payment are downstream of Orders — they consume order state, never create it.
- Inward Entry feeds Stock; Reorder List is consumed by Inward Entry (auto-status update).
- Smart Suggestions depend on Order history and current Stock state — they are read-only consumers.
- Notifications, Audit, Excel, PDF are pure cross-cutting consumers — they emit events, they never drive business logic.

---

## 3. User Role Hierarchy

```
                    ┌─────────────────────┐
                    │        ADMIN        │   Level 0 — Super Authority
                    │  Full visibility,   │   Manages users, regions, products,
                    │  all modules,       │   prices, reports, audit, overrides
                    │  all overrides      │
                    └──────────┬──────────┘
           ┌──────────────────┼──────────────────┐
           ▼                  ▼                  ▼
  ┌────────────────┐ ┌─────────────────┐ ┌─────────────────┐
  │ SALES MANAGER  │ │ INVENTORY MGR   │ │ DISPATCH WORKER │  Level 1 — Peers
  │ Orders, Party, │ │ Stock, Inward,  │ │ Challan pickup, │
  │ Payments,      │ │ Reorder, Price  │ │ Dispatch        │
  │ Suggestions    │ │ updates,        │ │ confirmation    │
  └────────────────┘ │ Challan approve │ └─────────────────┘
                     └─────────────────┘
```

**Key rules:**
- Admin is the only Level-0 role. It does not perform day-to-day transactions but can override any of them.
- SM, IM, and DW are peer roles — they cannot see or act on each other's modules except via explicit workflow handoffs (confirmed order → IM approval queue → DW dispatch queue).
- Password resets are Admin-only. Account creation is Admin-only. There is no self-registration.
- Login ID follows the pattern: `{role_prefix}_{name}` (e.g. `sm_ravi`, `im_suresh`, `dw_kiran`).

---

## 4. Permission Matrix

| Module | Admin | Sales Manager | Inventory Manager | Dispatch Worker |
|---|---|---|---|---|
| User Management | Full | None | None | None |
| Region Management | Full | None | None | None |
| Party Management | Full | Own (C/R/U) | Read | None |
| Product Catalogue | Full | Read | Full | Read |
| SM Selling Price | Full (margin view) | Own orders only | None | None |
| Inventory — Stock1 | Read+Override | None | Full | Read |
| Inventory — Stock2 | Read+Override | Read (own orders) | Full | Consume |
| Inward Stock Entry | Read+Export | None | Full | None |
| Orders & Challan | Full+Override | Own (full lifecycle) | Approve/Flag/Return | Read (assigned) |
| Dispatch | Full+Override | Read (status) | Read | Own (pick/dispatch) |
| Payment Tracking | Full | Own parties, C/R/U | None | None |
| Monthly Price Update | Full | None | Full | None |
| Reorder List | Read+Export | Flag items (C/R) | Full | None |
| Smart Suggestions | Read (all) | Read (sales-scope) | Read (stock-scope) | None |
| Notifications | All categories | Own scope | Own scope | Own scope |
| Audit Logs | Full (view+export) | None | None | None |
| Excel Import | Full | Party export only | Products+Stock import | None |
| PDF Generation | All reports | Invoice (own orders) | Stock report, Challan | Dispatch note |

Enforcement: this matrix is stored in the `role_permissions` table and enforced server-side via RBAC middleware on every API route. The frontend reflects this table — it does not implement independent authorization logic.

---

## 5. Notification Architecture

### Trigger Events & Recipients

| Event | Trigger Point | Recipients | Channel |
|---|---|---|---|
| New order submitted | `OrderSvc.create()` | All active IMs | Socket → role:im room |
| Order approved | `OrderSvc.approve()` | Originating SM | Socket → user:{id} |
| Order flagged by IM | `OrderSvc.flag()` | Originating SM | Socket → user:{id} |
| Order dispatched | `DispatchSvc.complete()` | Originating SM, Admin | Socket → user + role:admin |
| Stock below threshold | Cron job (every 6h) | Admin, all IMs | Socket → role:admin, role:im |
| Credit limit exceeded on order | `PartySvc.creditCheck()` | SM (inline), Admin | Inline warning + Socket → role:admin |
| Inward entry saved | `InwardSvc.save()` | Admin, IM | Socket → role:admin, role:im |
| Reorder flag status changed | `ReorderSvc.update()` | Originating SM | Socket → user:{id} |
| Price list updated | `PriceSvc.apply()` | Admin, all IMs, all SMs | Socket → broadcast |

### Notification Storage Model
Every socket event is also persisted to `notifications` + `notification_recipients`. This ensures:
- Users who are offline receive notifications on next login.
- The bell icon count is database-driven, not socket-state-dependent.
- Notifications survive server restarts.

### Delivery Strategy
- **Primary:** Socket.io push to relevant rooms.
- **Fallback:** 30-second polling endpoint `/api/notifications/unread-count` for clients that lose socket connection.
- **No email** is sent by the application (per spec). Admin downloads and shares manually.

---

## 6. Audit Architecture

### What Gets Logged
Every state-mutating operation: create, update, delete, approve, flag, dispatch, payment record, price update, import, export, PDF download, login, logout, failed login, account lockout.

### How It Works
The `AuditInterceptor` wraps the service layer. Every service method that mutates state calls `AuditSvc.log()` as a fire-and-forget side effect after the transaction commits. It captures:
- `actor_id`, `actor_role`, `actor_name`
- `action_type`: create | update | delete | approve | flag | dispatch | login | export | import
- `module`, `entity_type`, `entity_id`
- `before_state` (JSON snapshot), `after_state` (JSON snapshot)
- `ip_address`, `user_agent`, `server_timestamp`

### Immutability Guarantee
The MySQL application user (`erp_app`) has **no UPDATE or DELETE permissions** on `audit_logs`. Only INSERT and SELECT are granted. Any attempt to alter audit records fails at the DB driver level.

### Viewer
Admin-only. Searchable by: user, role, module, action, date range, entity ID. Exportable to Excel.

---

## 7. Order Workflow

```
SM creates order
  │
  ▼
[Party selected] → Credit check runs
  │                 ├─ Over limit → Warning shown inline, Admin alerted
  │                 └─ OK → continue
  ▼
[Smart Suggestion panel appears] (if party has history)
  │
  ▼
[SM adds items] → Live stock shown (combined Stock1+Stock2)
  │              → Base price shown (read-only)
  │              → SM selling price defaulted from rate card or base
  │              → If SM price < base: base price shown amber
  ▼
[Submit] → Order created, challan number auto-assigned
  │       → Status: PENDING
  │       → Stock NOT yet reserved (reservation on approval)
  │       → IM notified via socket
  ▼
[IM reviews]
  ├─ Approve → Status: APPROVED
  │            Stock reserved (Stock2 allocated)
  │            DW queue populated
  │            SM notified
  │
  ├─ Flag → Status: FLAGGED, reason recorded
  │         SM notified with reason
  │         SM can amend and resubmit
  │
  └─ Return/Cancel → Admin or IM only
                     Stock NOT reserved (or released if was reserved)
                     Ledger adjusted
                     Audit logged
```

**Dispatched orders are fully locked at the API level.** No PATCH or PUT accepted on orders with status DISPATCHED or DELIVERED.

---

## 8. Dispatch Workflow

```
Order APPROVED
  │
  ▼
Dispatch record created (status: QUEUED)
DW sees challan in their queue with:
  - Party name, address
  - Item list with Part No., Description, Rack location, Qty
  ▼
DW marks each item as PICKED
  │
  ▼
All items picked → DW marks order DISPATCHED
  │               → Server sets dispatch timestamp
  │               → SM notified in-app
  │               → Stock deducted (Stock1 first, then Stock2 if Stock1=0)
  │               → Order status → DISPATCHED
  ▼
[Daily dispatch summary PDF available to Admin/IM/DW]
```

---

## 9. Payment Workflow

```
SM opens Payment screen
  │
  ▼
Selects party → Outstanding balance shown
  │
  ▼
Selects challan(s) to pay against (or marks as advance)
  │
  ▼
Enters: Amount, Mode (Cash/Cheque/UPI), Reference No.
  │
  ▼
Submits → Payment recorded
  │       → Party outstanding_balance decremented
  │       → Payment ageing tracked:
  │           Green  = < 15 days
  │           Amber  = 15–30 days
  │           Red    = > 30 days
  │       → Audit logged
  ▼
[Admin and SM can view party ledger: orders + payments + outstanding]
```

Partial payments supported — balance reduces proportionally per challan.

---

## 10. Reorder Workflow

```
SM on order screen sees item: OUT OF STOCK
  │
  ▼
'Flag for Reorder' button appears
  │
  ▼
SM enters: Qty wanted, Optional note
  │         Party context auto-captured
  │
  ▼
Reorder flag created → Status: OPEN
  │                  → IM and Admin see it on Reorder List
  │
  ▼
IM reviews Reorder List (consolidated by part number)
  Shows: Part no., Description, Total qty requested,
         Times flagged, Last flagged date, Status
  │
  ▼
IM contacts supplier → Marks item as ORDERED → Status: ORDERED
  │
  ▼
Goods arrive → IM creates Inward Stock Entry (Module 15)
  │
  ▼
System detects part number matches open/ordered reorder flag
  │
  ▼
Reorder flag auto-updates → Status: RECEIVED
  │                        → SM notified in-app
  ▼
[SM sees own flags on dashboard: Item, Status, Date flagged]
[Admin can export full reorder list to Excel/CSV]
```

---

## 11. Smart Suggestion Workflow

```
SM selects party to start order
  │
  ▼
System queries last 3 DISPATCHED orders for this party
  │
  ▼
Filter qualifying items:
  - Ordered in last 3 dispatched orders
  - Within last 90 days
  - Currently In Stock or Low Stock (not OOS)
  - Not already added to this order session
  - Deduplication: each part number appears once (most recent order's date+qty used)
  │
  ▼
If qualifying items exist → Suggestion panel renders
  Shows per item:
    - Product name, Part number
    - Last order date, Last qty ordered
    - Current stock status badge
  │
  ▼
SM taps '+ Add' → Item added with last-ordered qty pre-filled (editable)
  │             → Item disappears from panel
  │             → order_items.suggestion_added = TRUE
  │
  ▼
[If party has no history, or all items are OOS or outside 90 days:
 Panel does not appear at all]

[Admin dashboard shows Suggestion Conversion Rate:
 suggestions acted on vs skipped, per SM]
```

---

## 12. Stock1 / Stock2 Workflow

```
INITIAL STATE (Excel Import)
  All imported stock qty → Stock1 (opening physical count)
  Stock2 = 0 for all products

INWARD ENTRIES (ongoing goods receipt)
  All new stock → Stock2 only
  Stock1 never increases after initial import

SM VIEW
  Always sees: combined_qty = stock1_qty + stock2_qty
  Never sees the split

ADMIN / IM VIEW
  Sees split: Stock1 qty | Stock2 qty | Combined

DEDUCTION RULES (on Dispatch)
  If stock1_qty > 0 for item:
    Deduct from stock1_qty first
  If stock1_qty = 0 for item:
    Deduct from stock2_qty
    Dual tracking ends permanently for this item
    (stock1_qty stays 0, no longer tracked separately)

ADMIN CLEANUP DASHBOARD
  Shows: Items still in dual-tracking vs single-tracking
  Manual cleanup trigger: Admin can force-move remaining Stock1 to Stock2
  for items where dual tracking is no longer operationally needed

STOCK STATES (per product)
  In Stock   = combined_qty > low_stock_threshold    → Green
  Low Stock  = 0 < combined_qty ≤ low_stock_threshold → Amber
  Out of Stock = combined_qty = 0                    → Red
```

---

## 13. Dashboard Widgets

### Admin Dashboard
- Total orders today / this week / this month
- Orders by status (Pending / Approved / Dispatched)
- Revenue this month (sum of dispatched order totals)
- Parties with credit limit exceeded (count + list)
- Low stock alerts (count + top 10 items)
- Stock1 cleanup progress (% of products still dual-tracking)
- Reorder list summary (Open / Ordered / Received counts)
- Suggestion conversion rate by SM
- Recent audit log entries (last 20)
- Active users online (socket-driven)

### Sales Manager Dashboard
- My orders today / pending / flagged
- My parties: outstanding balances (top 5 overdue)
- My reorder flags: item, status, date flagged
- Pricing summary: avg discount given this month, orders below base price count
- Smart suggestions available (parties I visit that have suggestions ready)

### Inventory Manager Dashboard
- Pending orders awaiting approval (count + list)
- Low stock items (count + top items)
- Reorder list: Open flags needing action
- Today's inward entries (count + total items received)
- Stock1 / Stock2 split summary
- Price list last updated date

### Dispatch Worker Dashboard
- My assigned challans: count + list (QUEUED / PICKING / PACKED)
- Today's dispatched count
- Quick access to daily dispatch summary PDF

---

## 14. Sidebar Structures

### Admin Sidebar
```
Dashboard
Users & Roles
  ├── Users
  └── Roles
Regions
Parties
Products
  ├── Catalogue
  └── Price History
Inventory
  ├── Stock Overview
  ├── Inward Entries
  └── Stock Cleanup
Orders & Challans
Dispatch
Payments & Ledger
Reorder List
Reports
  ├── Sales Report
  ├── Stock Report
  ├── Audit Log
  ├── Import History
  └── Suggestion Conversion
Notifications
Settings
```

### Sales Manager Sidebar
```
Dashboard
My Parties
Orders
  ├── New Order
  ├── My Orders
  └── Order History
Payments
  ├── Log Payment
  └── Party Ledger
Reorder Flags
Notifications
```

### Inventory Manager Sidebar
```
Dashboard
Stock Overview
  ├── Stock1 / Stock2 View
  └── Low Stock Alerts
Inward Entries
  ├── New Inward Entry
  └── Inward History
Orders (Pending Approval)
Challans
Reorder List
Price Updates
Reports
  ├── Stock Report
  └── Inward Report
Notifications
```

### Dispatch Worker Sidebar
```
Dashboard
My Challans
  ├── Pending Pickup
  └── Dispatched Today
Dispatch Summary PDF
Notifications
```

---

## 15. Route Structures

### Public Routes
```
/login
/forgot-password (Admin-reset flow only — no self-service)
```

### Admin Routes
```
/admin/dashboard
/admin/users
/admin/users/new
/admin/users/:id/edit
/admin/regions
/admin/parties
/admin/parties/:id
/admin/parties/import
/admin/products
/admin/products/:id
/admin/products/import
/admin/products/price-update
/admin/inventory
/admin/inventory/inward
/admin/inventory/inward/:id
/admin/inventory/stock-cleanup
/admin/orders
/admin/orders/:id
/admin/dispatch
/admin/payments
/admin/payments/:id
/admin/reorder
/admin/reports/sales
/admin/reports/stock
/admin/reports/audit
/admin/reports/imports
/admin/reports/suggestions
/admin/notifications
/admin/settings
```

### Sales Manager Routes
```
/sm/dashboard
/sm/parties
/sm/parties/:id
/sm/orders/new
/sm/orders
/sm/orders/:id
/sm/payments/new
/sm/payments
/sm/ledger/:partyId
/sm/reorder-flags
/sm/notifications
```

### Inventory Manager Routes
```
/im/dashboard
/im/stock
/im/inward/new
/im/inward
/im/inward/:id
/im/orders/pending
/im/orders/:id
/im/challans
/im/challans/:id
/im/reorder
/im/prices/update
/im/reports/stock
/im/reports/inward
/im/notifications
```

### Dispatch Worker Routes
```
/dw/dashboard
/dw/challans
/dw/challans/:id
/dw/dispatched
/dw/summary-pdf
/dw/notifications
```

---

## 16. Socket Events

### Client → Server
```
auth:connect        { token }           Authenticate socket handshake
notification:read   { notificationId }  Mark single notification read
notification:readAll {}                 Mark all as read
```

### Server → Client
```
notification:new         { id, type, title, message, severity, payload }
order:submitted          { orderId, orderNumber, partyName }      → to role:im
order:approved           { orderId, orderNumber }                 → to user:{smId}
order:flagged            { orderId, reason }                      → to user:{smId}
order:dispatched         { orderId, orderNumber, dispatchedAt }   → to user:{smId}, role:admin
stock:low                { productId, sku, combinedQty, threshold }  → to role:admin, role:im
stock:out                { productId, sku }                       → to role:admin, role:im
inward:saved             { inwardId, supplierName, itemCount }    → to role:admin, role:im
reorder:updated          { reorderFlagId, partNumber, newStatus } → to user:{smId}
price:updated            { uploadedBy, affectedCount }            → broadcast to all
credit:exceeded          { partyId, partyName, outstanding, limit } → to role:admin
```

---

## 17. API Philosophy

### REST Conventions
- **Base URL:** `/api/v1/`
- **Versioning:** URL-based (`/v1/`, `/v2/`) — not header-based, for proxy/cache friendliness
- **HTTP methods:** GET (read), POST (create), PUT (full replace), PATCH (partial update), DELETE (soft-delete)
- **Response envelope:**
  ```json
  {
    "success": true,
    "data": {},
    "meta": { "page": 1, "limit": 25, "total": 150 },
    "message": "Order created successfully"
  }
  ```
- **Error envelope:**
  ```json
  {
    "success": false,
    "error": { "code": "CREDIT_LIMIT_EXCEEDED", "message": "...", "details": {} }
  }
  ```
- **Pagination:** all list endpoints accept `?page=1&limit=25&sort=created_at&order=desc`
- **Filtering:** query params (`?status=PENDING&region_id=2&date_from=2025-01-01`)
- **Search:** `?q=search+term` on all list endpoints that support it

### Security
- JWT access tokens: 15-minute expiry
- Refresh tokens: 7-day expiry, stored in DB, rotation on use
- Session timeout: 30 minutes of inactivity enforced server-side via last_active_at
- Account lockout: 5 failed attempts → locked for 15 minutes (or Admin reset)
- First login: forced password change endpoint — all other routes blocked until complete
- RBAC enforced independently on every route — not inherited from shell or middleware chain position

---

## 18. Folder Philosophy

**Feature-first, not layer-first.** Both frontend and backend are organized by domain module, not by technical layer. `src/modules/orders/` contains the controller, service, repository, routes, and tests for orders — not spread across `src/controllers/`, `src/services/`, etc.

**Shared infrastructure at the root.** Cross-cutting concerns (auth middleware, audit interceptor, socket manager, PDF/Excel utilities, validators) live in `src/shared/` or `src/middleware/` — never duplicated inside feature modules.

**No barrel files that aggregate everything.** Each module exports only what it explicitly needs to share. Internal module implementation files are not re-exported from module index files.

**Tests co-located with source.** `orders.service.test.js` sits next to `orders.service.js`. Integration tests in `src/__tests__/integration/`.

---

## 19. State Management Philosophy

### Frontend
**Zustand** manages:
- Auth state (user object, permissions map, tokens)
- UI state (sidebar collapsed, theme, active notifications count)
- Transient form state for multi-step flows (order builder)

**TanStack Query** manages:
- All server data (parties, products, orders, stock)
- Caching with stale-while-revalidate
- Optimistic updates for fast UX on mutations
- Automatic background refetch on window focus

**Rule:** Nothing that belongs in TanStack Query goes into Zustand. TanStack Query is the server cache. Zustand is for client-only UI and auth state.

### Backend
**Stateless.** No in-memory session state. All state lives in MySQL. Socket.io room membership is re-established on reconnect using the JWT room map. Cron jobs read from DB, write to DB, emit sockets — no in-memory accumulation.

---

## 20. Scalability Strategy

### Immediate (Current Build)
- MySQL 8.x with proper indexing (see DATABASE_STRUCTURE.md)
- Query pagination enforced — no unbounded list queries
- Socket.io rooms scoped by role and user — no broadcast to all
- Cron jobs use DB advisory locks to prevent double-execution

### Short-Term (6–12 months, if needed)
- Add Redis for:
  - Refresh token storage (faster revocation lookup)
  - Socket.io adapter (for multi-instance Node)
  - Rate limiter backing store
  - Notification unread count cache
- Add connection pooling via `mysql2` pool config
- Separate read replica for heavy report queries

### Medium-Term (beyond current scope)
- Extract PDF/Excel generation to a background worker queue (BullMQ + Redis)
- Extract cron jobs to a separate process or Lambda
- Add full-text search index for product catalogue and audit log
- CDN for generated PDF/Excel file storage (currently local disk)

**Current build target:** Single Node.js process, single MySQL instance, single Nginx. Designed to run comfortably on a single VPS for a company with up to 50 concurrent users and 5 years of order history without architectural changes.