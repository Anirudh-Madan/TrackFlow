# BACKEND_STRUCTURE.md
## Enterprise ERP — Backend Architecture
### Node.js + Express + Sequelize + MySQL + JWT + Socket.io

---

## Complete Folder Tree

```
backend/
├── app.js                          # Express app setup, CORS, body parsers, and route definitions
├── server.js                       # HTTP server start, Socket.io initialization, DB sync, seed logic
├── .env                            # Environment variables config file (local dev)
├── .env.example                    # Template for environment variables
├── seed.js                         # Production/staging DB seeding script
├── seed2.js                        # Alternative seeding script with realistic data
├── seed_products.js                # Helper script to seed product catalog
├── seed_dummy_challans.js          # Helper script to seed test delivery challans
├── seed_part_history_data.js       # Helper script to seed part transaction ledgers
├── seed_payments.js                # Helper script to seed payment history
├── seed_products_and_movement.js   # Helper script to seed stock movement logs
├── seed_sales_report_data.js       # Helper script to seed sales report records
├── seed_supplier_report_data.js    # Helper script to seed supplier report records
├── unlock_accounts.js              # Administrative utility script to unlock locked accounts
├── package.json                    # Node dependencies & script configurations
├── package-lock.json
│
├── config/
│   ├── database.js                 # Sequelize connection configuration & MySQL settings
│   └── redis.js                    # Redis client setup (optional caching/session handling)
│
├── middleware/
│   ├── authenticate.js             # JWT verification middleware (attaches req.user)
│   ├── authorizePermission.js      # RBAC middleware (checks specific permission keys)
│   ├── authorizeRoles.js           # RBAC middleware (checks specific user roles)
│   ├── error.middleware.js         # Centralized error handler middleware
│   └── upload.middleware.js        # Multer storage configuration for file uploads & CSVs
│
├── services/
│   ├── audit.service.js            # Audit logger service for recording security & data events
│   ├── email.service.js            # Email notification service
│   ├── notification.service.js     # Shared helper service to create system notifications & emit via Socket.io
│   └── socket.service.js           # Real-time WebSocket connection manager & room handler
│
├── models/                         # Sequelize models & associations
│   ├── index.js                    # DB connection setup, association mapping, dynamic loading
│   ├── AuditLog.js                 # System activity & audit logs
│   ├── Challan.js                  # Delivery challans table definition
│   ├── ChallanItem.js              # Line items attached to delivery challans
│   ├── Inward.js                   # Stock inward header entry
│   ├── InwardItem.js               # Line items inside inward entries
│   ├── Notification.js             # User & role notifications table
│   ├── Order.js                    # Sales order table
│   ├── OrderItem.js                # Individual items inside sales orders
│   ├── Party.js                    # Customers, Suppliers, & Parties master table
│   ├── Payment.js                  # Payment records & ledger entries
│   ├── Permission.js               # System permission key definitions
│   ├── PriceList.js                # Price list master table (DL price, SP price, discounts)
│   ├── Product.js                  # Core products & parts catalog table
│   ├── PurchaseOrder.js            # Purchase order table
│   ├── PurchaseOrderItem.js        # Individual line items in purchase orders
│   ├── Region.js                   # Regional hierarchy table
│   ├── ReorderFlag.js              # Reorder indicators & minimum stock flags
│   ├── Role.js                     # System role definitions (admin, inventory_manager, sales_man, dispatch_worker)
│   ├── RolePermission.js           # Junction table mapping roles to permissions
│   ├── StockMovement.js            # Stock audit log / ledger of movements
│   └── User.js                     # User profile credentials & assigned region
│
└── modules/                        # Feature controllers & REST API routes
    ├── audit/
    │   ├── audit.controller.js
    │   └── audit.routes.js
    ├── auth/
    │   ├── auth.controller.js
    │   └── auth.routes.js
    ├── challans/
    │   ├── challans.controller.js
    │   └── challans.routes.js
    ├── dashboard/
    │   ├── dashboard.controller.js
    │   └── dashboard.routes.js
    ├── inventory/
    │   ├── inventory.controller.js
    │   └── inventory.routes.js
    ├── inward/
    │   ├── inward.controller.js
    │   └── inward.routes.js
    ├── notifications/
    │   ├── notifications.controller.js
    │   └── notifications.routes.js
    ├── orders/
    │   ├── orders.controller.js
    │   └── orders.routes.js
    ├── parties/
    │   ├── parties.controller.js
    │   └── parties.routes.js
    ├── payments/
    │   ├── payments.controller.js
    │   └── payments.routes.js
    ├── pipeline/
    │   ├── pipeline.controller.js  # Kanban pipeline status transitions & DW assignments
    │   └── pipeline.routes.js
    ├── prices/
    │   ├── prices.controller.js
    │   └── prices.routes.js
    ├── products/
    │   ├── products.controller.js # Catalog endpoints & CSV bulk import processing
    │   └── products.routes.js
    ├── purchaseOrders/
    │   ├── purchaseOrders.controller.js
    │   └── purchaseOrders.routes.js
    ├── regions/
    │   ├── regions.controller.js   # Region management & assigned dispatch workers
    │   └── regions.routes.js
    ├── reports/
    │   ├── reports.controller.js   # Part transaction history, sales, & stock reports
    │   └── reports.routes.js
    └── users/
        ├── users.controller.js     # User management & PIN authentication verification
        └── users.routes.js
```

---

## Key Backend Features & API Endpoint Modules

1. **Pipeline & Dispatch (`/api/v1/pipeline`)**:
   * Order workflow transitions: Pending → Approved → Packed → Dispatched → Delivered.
   * `getDispatchWorkers`: Returns dispatch workers filtered by the specified region or customer's region to prevent misassignment.

2. **Challans API (`/api/v1/challans`)**:
   * Generates delivery challans with bill numbers.
   * Price calculation enforces zero added GST (DL price includes GST).

3. **Part History API (`/api/v1/reports/part-history` & `part-suggestions`)**:
   * Fetches complete ledger of all transactions for any SKU/part number.
   * Provides catalog search suggestions for part history lookup.

4. **Real-time WebSockets (`services/socket.service.js`)**:
   * Emits live events to role rooms (`inventory_manager`, `dispatch_worker`, `admin`, `sales_man`) for status updates and order assignments.