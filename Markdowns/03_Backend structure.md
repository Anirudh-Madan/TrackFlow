# BACKEND_STRUCTURE.md
## Enterprise ERP — Backend Architecture
### Node.js + Express + Sequelize + MySQL + JWT + Socket.io

---

## Complete Folder Tree

```
server/
├── app.js                          # Express app setup (no listen here)
├── server.js                       # HTTP server + Socket.io mount + listen
├── .env                            # Environment variables (never committed)
├── .env.example                    # Template for env vars
│
├── config/
│   ├── database.js                 # Sequelize connection config (reads env)
│   ├── jwt.js                      # JWT secret, expiry, refresh config
│   ├── cors.js                     # CORS origin whitelist config
│   ├── rateLimit.js                # Express rate limiter config
│   └── cron.js                     # Cron job schedule strings
│
├── middleware/
│   ├── authenticate.js             # JWT verification → req.user
│   ├── authorize.js                # RBAC guard: checks permission code vs DB
│   ├── firstLoginGuard.js          # Blocks all routes until password changed
│   ├── requestValidator.js         # Runs express-validator, returns 422 on fail
│   ├── auditInterceptor.js         # Wraps service calls, logs before/after state
│   ├── errorHandler.js             # Central error handler (last middleware)
│   ├── notFound.js                 # 404 handler for unmatched routes
│   └── activityTracker.js          # Updates user.last_active_at on each request
│
├── modules/                        # Feature modules — one directory per domain
│   │
│   ├── auth/
│   │   ├── auth.routes.js          # /api/v1/auth/* route definitions
│   │   ├── auth.controller.js      # login, logout, refresh, changePassword
│   │   ├── auth.service.js         # Business logic: verify password, issue tokens
│   │   ├── auth.validators.js      # express-validator schemas for auth endpoints
│   │   └── auth.repository.js      # DB queries: findByLoginId, saveRefreshToken
│   │
│   ├── users/
│   │   ├── users.routes.js
│   │   ├── users.controller.js
│   │   ├── users.service.js        # create, edit, deactivate, reset password
│   │   ├── users.validators.js
│   │   └── users.repository.js
│   │
│   ├── regions/
│   │   ├── regions.routes.js
│   │   ├── regions.controller.js
│   │   ├── regions.service.js
│   │   ├── regions.validators.js
│   │   └── regions.repository.js
│   │
│   ├── parties/
│   │   ├── parties.routes.js
│   │   ├── parties.controller.js
│   │   ├── parties.service.js      # create, edit, credit check, ledger
│   │   ├── parties.validators.js
│   │   └── parties.repository.js
│   │
│   ├── products/
│   │   ├── products.routes.js
│   │   ├── products.controller.js
│   │   ├── products.service.js     # CRUD, stock state computation
│   │   ├── products.validators.js
│   │   └── products.repository.js
│   │
│   ├── inventory/
│   │   ├── inventory.routes.js
│   │   ├── inventory.controller.js
│   │   ├── inventory.service.js    # Stock1/Stock2 read, combined view, split view
│   │   ├── inventory.validators.js
│   │   └── inventory.repository.js
│   │
│   ├── inward/
│   │   ├── inward.routes.js
│   │   ├── inward.controller.js
│   │   ├── inward.service.js       # Save entry, update stock2, trigger reorder auto-update
│   │   ├── inward.validators.js
│   │   └── inward.repository.js
│   │
│   ├── orders/
│   │   ├── orders.routes.js
│   │   ├── orders.controller.js
│   │   ├── orders.service.js       # Full order lifecycle: create, approve, flag, cancel, clone
│   │   ├── orders.validators.js
│   │   └── orders.repository.js
│   │
│   ├── challans/
│   │   ├── challans.routes.js
│   │   ├── challans.controller.js
│   │   ├── challans.service.js
│   │   ├── challans.validators.js
│   │   └── challans.repository.js
│   │
│   ├── dispatch/
│   │   ├── dispatch.routes.js
│   │   ├── dispatch.controller.js
│   │   ├── dispatch.service.js     # Pick items, mark dispatched, deduct stock
│   │   ├── dispatch.validators.js
│   │   └── dispatch.repository.js
│   │
│   ├── payments/
│   │   ├── payments.routes.js
│   │   ├── payments.controller.js
│   │   ├── payments.service.js     # Record payment, update outstanding, ageing
│   │   ├── payments.validators.js
│   │   └── payments.repository.js
│   │
│   ├── prices/
│   │   ├── prices.routes.js
│   │   ├── prices.controller.js
│   │   ├── prices.service.js       # Parse Excel upload, preview, apply, archive old
│   │   ├── prices.validators.js
│   │   └── prices.repository.js
│   │
│   ├── reorder/
│   │   ├── reorder.routes.js
│   │   ├── reorder.controller.js
│   │   ├── reorder.service.js      # Flag, update status, auto-update on inward
│   │   ├── reorder.validators.js
│   │   └── reorder.repository.js
│   │
│   ├── suggestions/
│   │   ├── suggestions.routes.js
│   │   ├── suggestions.controller.js
│   │   ├── suggestions.service.js  # Query last 3 dispatched orders, apply filter rules
│   │   └── suggestions.repository.js
│   │
│   ├── notifications/
│   │   ├── notifications.routes.js
│   │   ├── notifications.controller.js
│   │   ├── notifications.service.js  # Create, persist, emit via socket
│   │   └── notifications.repository.js
│   │
│   ├── audit/
│   │   ├── audit.routes.js
│   │   ├── audit.controller.js
│   │   ├── audit.service.js        # Log, query (Admin only), export
│   │   └── audit.repository.js
│   │
│   ├── import/
│   │   ├── import.routes.js
│   │   ├── import.controller.js
│   │   ├── import.service.js       # Parse Excel, validate, preview, confirm
│   │   └── import.repository.js
│   │
│   └── reports/
│       ├── reports.routes.js
│       ├── reports.controller.js
│       └── reports.service.js      # Aggregations for dashboard + report pages
│
├── shared/                         # Cross-cutting shared utilities
│   │
│   ├── socket/
│   │   ├── socketServer.js         # Socket.io setup, room management
│   │   ├── socketAuth.js           # Socket handshake JWT verification
│   │   └── socketEmitter.js        # Utility: emit to room or user by ID
│   │
│   ├── pdf/
│   │   ├── pdfGenerator.js         # PDFKit wrapper, base layout
│   │   ├── templates/
│   │   │   ├── challanPdf.js       # Challan PDF template
│   │   │   ├── dispatchSummaryPdf.js
│   │   │   ├── stockReportPdf.js
│   │   │   └── auditReportPdf.js
│   │   └── pdfStorage.js           # Save to disk, return file path
│   │
│   ├── excel/
│   │   ├── excelReader.js          # ExcelJS: parse uploaded workbooks
│   │   ├── excelWriter.js          # ExcelJS: generate export workbooks
│   │   └── templates/
│   │       ├── productTemplate.js  # Define columns for product import template
│   │       ├── partyTemplate.js
│   │       └── priceListParser.js  # Cummins/Meritor/Lucas Delphi format parser
│   │
│   ├── storage/
│   │   └── fileStorage.js          # Multer config: disk storage, file naming
│   │
│   ├── notifications/
│   │   └── notificationDispatcher.js  # Called by services → creates DB record + socket emit
│   │
│   ├── audit/
│   │   └── auditLogger.js          # Called by auditInterceptor → appends to audit_logs
│   │
│   └── errors/
│       ├── AppError.js             # Base error class with statusCode + errorCode
│       ├── ValidationError.js
│       ├── NotFoundError.js
│       ├── UnauthorizedError.js
│       ├── ForbiddenError.js
│       └── BusinessRuleError.js    # e.g. CreditLimitExceeded, OrderLocked
│
├── models/                         # Sequelize model definitions
│   ├── index.js                    # Model registry + association definitions
│   ├── User.js
│   ├── Role.js
│   ├── Permission.js
│   ├── RolePermission.js
│   ├── RefreshToken.js
│   ├── LoginAttempt.js
│   ├── Region.js
│   ├── Party.js
│   ├── PartyRateCard.js
│   ├── Product.js
│   ├── ProductCategory.js
│   ├── ProductCustomField.js
│   ├── PriceHistory.js
│   ├── Stock.js                    # Combined: stock1_qty + stock2_qty + dual_tracking_active
│   ├── StockMovement.js            # Immutable ledger
│   ├── InwardEntry.js
│   ├── InwardItem.js
│   ├── Order.js
│   ├── OrderItem.js
│   ├── OrderStatusHistory.js
│   ├── Challan.js                  # 1:1 with Order after approval
│   ├── Dispatch.js
│   ├── DispatchItem.js
│   ├── Payment.js
│   ├── ReorderFlag.js
│   ├── Notification.js
│   ├── NotificationRecipient.js
│   ├── AuditLog.js
│   ├── ImportHistory.js
│   └── GeneratedDocument.js
│
├── migrations/                     # Sequelize migrations (ordered, numbered)
│   ├── 001-create-roles.js
│   ├── 002-create-permissions.js
│   ├── 003-create-users.js
│   ├── 004-create-regions.js
│   ├── ...
│   └── 030-create-generated-documents.js
│
├── seeders/                        # Sequelize seeders
│   ├── 001-seed-roles.js
│   ├── 002-seed-permissions.js     # Seeds full permission matrix
│   └── 003-seed-admin-user.js      # Seeds default admin account
│
├── jobs/                           # Cron job definitions
│   ├── jobScheduler.js             # node-cron: registers all jobs
│   ├── stockAlertJob.js            # Every 6h: check low/OOS stock → notify
│   ├── creditSweepJob.js           # Daily: check all parties for credit breaches
│   ├── sessionCleanupJob.js        # Hourly: revoke expired refresh tokens
│   └── suggestionRefreshJob.js     # Hourly: pre-compute suggestion sets (optional cache)
│
└── utils/
    ├── response.js                 # Standard response envelope helpers
    ├── pagination.js               # Extract page/limit/sort from query params
    ├── dateUtils.js                # Date formatting, ageing calculation
    ├── numberUtils.js              # Currency rounding helpers
    └── constants.js                # Shared string constants (statuses, etc.)
```

---

## Middleware Architecture

Middleware runs in this exact order on every request:

```
Helmet (security headers)
  → CORS (origin check)
    → Body Parser (JSON + multipart via Multer)
      → Rate Limiter (per-IP, configurable)
        → authenticate.js (JWT decode → req.user or 401)
          → activityTracker.js (update last_active_at)
            → firstLoginGuard.js (block if must_change_password)
              → authorize.js (check req.user.permissions vs route permission code)
                → requestValidator.js (express-validator, 422 on fail)
                  → Controller → Service
                    → auditInterceptor.js (fires after response, side-effect)
                      → errorHandler.js (catches all thrown errors)
```

**`authenticate.js`** extracts the Bearer token from `Authorization` header. Verifies the JWT. Loads the user with their permissions from DB (or short-lived cache). Attaches to `req.user`. Throws `UnauthorizedError` on any failure.

**`authorize.js`** receives the required `permissionCode` (defined at route registration). Checks `req.user.permissions` Set. Throws `ForbiddenError` if not present.

**`auditInterceptor.js`** wraps `res.json()` to intercept the response. After a mutation succeeds (status 200/201), it calls `AuditLogger.log()` with the captured before/after state. This is fire-and-forget — audit failures do not fail the original request.

**`errorHandler.js`** is the final `(err, req, res, next)` middleware. Maps `AppError` subclasses to HTTP status codes. Logs unexpected errors. Returns structured error envelope.

---

## Controller Layer

Controllers are thin. Each controller method:
1. Extracts validated data from `req.body`, `req.params`, `req.query`
2. Calls the relevant service method
3. Calls `res.json(response.success(data, message))`

Controllers never contain business logic, DB calls, or error handling logic (errors bubble to `errorHandler`).

```js
// orders.controller.js
async createOrder(req, res) {
  const order = await OrderService.createOrder(req.user, req.body);
  res.status(201).json(response.success(order, 'Order created'));
}
```

---

## Service Layer

Services own all business rules. They:
- Coordinate between repositories and other services
- Enforce business rules (credit check, stock availability, order lock check)
- Call `NotificationDispatcher` when events occur
- Do **not** directly call `AuditLogger` — that's the interceptor's job

```js
// orders.service.js
async createOrder(actor, orderData) {
  const party = await PartyRepository.findById(orderData.party_id);
  await CreditService.check(party);            // throws BusinessRuleError if over limit
  await StockService.validateAvailability(orderData.items);
  const order = await OrderRepository.create(orderData, actor);
  await NotificationDispatcher.orderSubmitted(order);
  return order;
}
```

---

## Repository Layer

Repositories are the only layer that talks to Sequelize/MySQL. They:
- Return plain JS objects (not Sequelize model instances) using `.toJSON()` or `{ raw: true }`
- Accept filter/pagination objects and build `WHERE` clauses
- Never contain business logic

```js
// orders.repository.js
async findAll({ status, sales_manager_id, page, limit, sort }) {
  return Order.findAndCountAll({
    where: buildWhereClause({ status, sales_manager_id }),
    include: [{ model: Party, attributes: ['id', 'name'] }],
    order: [[sort.field, sort.dir]],
    limit,
    offset: (page - 1) * limit
  });
}
```

---

## Validator Layer

Every route that accepts input has a validator file. Uses `express-validator` chains. The `requestValidator.js` middleware runs them and returns a structured 422 response listing all field errors.

```js
// orders.validators.js
export const createOrderValidator = [
  body('party_id').isInt().notEmpty(),
  body('items').isArray({ min: 1 }),
  body('items.*.product_id').isInt(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('items.*.sm_price').isDecimal({ decimal_digits: '0,2' }).optional()
];
```

---

## Socket Layer

### `socketServer.js`
Mounts Socket.io on the HTTP server. On connection:
1. Calls `socketAuth.js` to verify JWT from handshake
2. Joins user to `role:{role}` room and `user:{userId}` room
3. Registers disconnect handler

```js
io.on('connection', (socket) => {
  const user = verifySocketToken(socket.handshake.auth.token);
  socket.join(`role:${user.role}`);
  socket.join(`user:${user.id}`);

  socket.on('notification:read', (data) => NotificationService.markRead(data.id, user));
  socket.on('notification:readAll', () => NotificationService.markAllRead(user.id));
});
```

### `socketEmitter.js`
```js
emitToRole(role, event, data)   // → io.to(`role:${role}`).emit(event, data)
emitToUser(userId, event, data) // → io.to(`user:${userId}`).emit(event, data)
emitToAll(event, data)          // → io.emit(event, data)
```

Services call `socketEmitter` through `NotificationDispatcher`. Services never import `io` directly.

---

## PDF Layer

Built with PDFKit. Each template function receives a data object and returns a Buffer.

The `ChallanPdf` template renders:
- Company header (name, logo area)
- Challan number, date/time, SM name
- Party name and billing/shipping address
- Items table: Part No. | Description | Rack Location | Qty | SM Price | Line Total
- GST breakdown by rate
- Grand Total
- Footer

PDF files are saved to `storage/pdfs/{type}/{date}/{filename}.pdf` and the path stored in `generated_documents`. Files are served via a download endpoint that streams the file (never base64 in API response).

---

## Excel Layer

Built with ExcelJS.

**Import flow:**
1. Multer saves uploaded file to `storage/uploads/temp/`
2. `ExcelReader` parses the workbook
3. `ImportService` validates each row, collects errors
4. Preview payload returned (success rows + error rows with reasons)
5. On user confirm: ImportService runs confirmed rows in a DB transaction
6. Result logged to `import_history`

**Export flow:**
1. Service queries data
2. `ExcelWriter` creates a workbook with headers + data rows
3. File saved to `storage/exports/` with timestamp in filename
4. Response: file stream or download URL

---

## Audit Layer

### `auditLogger.js`
```js
async function log({ actor, action, module, entityType, entityId, beforeState, afterState, ip }) {
  await AuditLog.create({
    actor_id: actor.id,
    actor_role: actor.role,
    actor_name: actor.name,
    action_type: action,
    module,
    entity_type: entityType,
    entity_id: entityId,
    before_state: beforeState ? JSON.stringify(beforeState) : null,
    after_state: afterState ? JSON.stringify(afterState) : null,
    ip_address: ip,
    created_at: new Date()
  });
}
```

Called from `auditInterceptor.js` as a fire-and-forget `process.nextTick`. Failures are logged to application log but do not affect the response.

---

## Notification Layer

### `notificationDispatcher.js`
Called by services when business events occur. Does two things:
1. Persists to `notifications` + `notification_recipients` (so offline users see it on login)
2. Emits socket event to appropriate room(s)

```js
async function orderSubmitted(order) {
  const notif = await NotificationRepository.create({
    type: 'order:submitted',
    title: 'New Order Submitted',
    message: `${order.party_name} - ${order.order_number}`,
    severity: 'info',
    payload: { order_id: order.id }
  });
  await NotificationRepository.addRecipientsForRole('inventory_manager', notif.id);
  socketEmitter.emitToRole('inventory_manager', 'notification:new', notif);
}
```

---

## Cron Jobs

All jobs registered in `jobScheduler.js` using `node-cron`.

### `stockAlertJob.js` — Every 6 hours
1. Query all products where `combined_qty <= low_stock_threshold`
2. For each: call `NotificationDispatcher.stockLow(product)` if not already notified in last 6h (dedup check via last notification timestamp)

### `creditSweepJob.js` — Daily at 06:00
1. Query all parties where `outstanding_balance > credit_limit`
2. Create/update credit alert notifications for Admin

### `sessionCleanupJob.js` — Every hour
1. Delete `refresh_tokens` where `expires_at < NOW()` or `revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL 7 DAY`
2. Reset `login_attempts` where last attempt is > 15 minutes ago and attempts >= 5

### `suggestionRefreshJob.js` — Every hour
1. For each active SM, pre-compute suggestion sets for their parties with recent activity
2. Store in a lightweight `suggestion_cache` table (optional optimization — service can also compute on-demand)

---

## Config Layer

### `.env` keys
```
NODE_ENV=production
PORT=3000
DB_HOST=
DB_PORT=3306
DB_NAME=erp_db
DB_USER=erp_app
DB_PASSWORD=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
STORAGE_PATH=./storage
MAX_UPLOAD_SIZE_MB=10
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
CORS_ORIGIN=https://yourdomain.com
```

All config files read from `process.env` — never hardcoded values in source.