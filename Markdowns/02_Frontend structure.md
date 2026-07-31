# FRONTEND_STRUCTURE.md
## Enterprise ERP — Frontend Architecture
### React 18 + Vite + Tailwind CSS + React Router DOM + TanStack Query + Zustand

---

## Complete Folder Tree

```
└── frontend
    ├── eslint.config.js
    ├── index.html
    ├── package-lock.json
    ├── package.json
    ├── postcss.config.js
    ├── README.md
    ├── vite.config.js
    ├── public
    │   ├── favicon.svg
    │   └── icons.svg
    └── src
        ├── App.css
        ├── App.jsx                  # Main application component with query provider & toast container
        ├── index.css                # Global design system & Tailwind utility classes
        ├── main.jsx                 # Entrypoint (ReactDOM render)
        ├── api
        │   ├── client.js            # Axios instance configuration (baseURL /api/v1, headers, interceptors)
        │   ├── endpoints
        │   │   ├── analytics.api.js
        │   │   ├── audit.api.js
        │   │   ├── auth.api.js
        │   │   ├── challans.api.js
        │   │   ├── inventory.api.js
        │   │   ├── inward.api.js
        │   │   ├── notifications.api.js
        │   │   ├── orders.api.js
        │   │   ├── partRequests.api.js
        │   │   ├── parties.api.js
        │   │   ├── payments.api.js
        │   │   ├── pipeline.api.js
        │   │   ├── prices.api.js
        │   │   ├── products.api.js   # Product catalog APIs & CSV import helpers
        │   │   ├── purchaseOrders.api.js
        │   │   ├── rbac.api.js
        │   │   ├── regions.api.js
        │   │   ├── reorder.api.js
        │   │   ├── reports.api.js
        │   │   └── users.api.js
        │   └── interceptors
        │       ├── authInterceptor.js
        │       └── refreshInterceptor.js
        ├── components
        │   ├── data
        │   │   ├── DataTable.jsx
        │   │   ├── PaymentAgeingBadge.jsx
        │   │   ├── StatCard.jsx
        │   │   ├── StatusBadge.jsx
        │   │   ├── StockBadge.jsx
        │   │   ├── TableFilters.jsx
        │   │   └── TablePagination.jsx
        │   ├── feedback
        │   │   ├── ConfirmDialog.jsx
        │   │   ├── ErrorBoundary.jsx
        │   │   └── Toast.jsx
        │   ├── form
        │   │   ├── FormDatePicker.jsx
        │   │   ├── FormField.jsx
        │   │   ├── FormFileUpload.jsx
        │   │   ├── FormSearchSelect.jsx
        │   │   ├── FormSelect.jsx
        │   │   └── FormTextarea.jsx
        │   ├── layout
        │   │   ├── Breadcrumb.jsx
        │   │   ├── GlobalSearch.jsx
        │   │   ├── NotificationBell.jsx
        │   │   ├── ProfileMenu.jsx
        │   │   ├── Sidebar.jsx
        │   │   ├── SidebarGroup.jsx
        │   │   ├── SidebarItem.jsx
        │   │   └── TopNavbar.jsx
        │   └── ui
        │       ├── Alert.jsx
        │       ├── Badge.jsx
        │       ├── Button.jsx
        │       ├── Card.jsx
        │       ├── Checkbox.jsx
        │       ├── ComingSoon.jsx
        │       ├── Divider.jsx
        │       ├── Drawer.jsx
        │       ├── EmptyState.jsx
        │       ├── Input.jsx
        │       ├── Modal.jsx
        │       ├── Select.jsx
        │       ├── Skeleton.jsx
        │       ├── Spinner.jsx
        │       ├── Tabs.jsx
        │       ├── Textarea.jsx
        │       └── Tooltip.jsx
        ├── constants
        │   ├── orderStatuses.js
        │   ├── paymentModes.js
        │   ├── permissions.js
        │   ├── reorderStatuses.js
        │   ├── roles.js
        │   └── socketEvents.js
        ├── hooks
        │   ├── useAuth.js
        │   ├── useConfirm.js
        │   ├── useDebounce.js
        │   ├── usePagination.js
        │   ├── usePermission.js
        │   ├── useTableFilters.js
        │   └── useToast.js
        ├── layouts
        │   ├── AdminLayout.jsx
        │   ├── AuthLayout.jsx
        │   ├── DWLayout.jsx
        │   ├── IMLayout.jsx
        │   ├── PublicLayout.jsx
        │   └── SMLayout.jsx
        ├── modules
        │   ├── audit
        │   │   └── pages
        │   │       └── AuditLogPage.jsx
        │   ├── auth
        │   │   └── pages
        │   │       ├── ChangePasswordPage.jsx
        │   │       ├── LoginPage.jsx
        │   │       └── UnauthorizedPage.jsx
        │   ├── challans
        │   │   └── pages
        │   │       ├── AdminChallanPage.jsx  # Full admin delivery challan management
        │   │       ├── BillsListPage.jsx     # Bill numbers registry
        │   │       ├── ChallansListPage.jsx  # IM/Role delivery challans listing & print
        │   │       └── PublicChallanView.jsx # Shareable public challan link
        │   ├── dashboard
        │   │   ├── admin
        │   │   │   └── AdminDashboard.jsx
        │   │   ├── dw
        │   │   │   └── DWDashboard.jsx
        │   │   ├── im
        │   │   │   └── IMDashboard.jsx
        │   │   └── sm
        │   │       └── SMDashboard.jsx
        │   ├── inventory
        │   │   └── pages
        │   │       ├── StockMovementPage.jsx # Stock audit movement logs
        │   │       ├── StockOverviewPage.jsx # Stock level analysis
        │   │       └── VelocityMinStockPage.jsx
        │   ├── inward
        │   │   └── pages
        │   │       ├── AdminPOPage.jsx       # Admin Purchase Order management & PIN actions
        │   │       ├── InwardDetailPage.jsx
        │   │       ├── InwardListPage.jsx
        │   │       ├── InwardNewPage.jsx
        │   │       └── PublicPOView.jsx      # Shareable public PO link
        │   ├── notifications
        │   │   └── pages
        │   │       └── NotificationsPage.jsx
        │   ├── orders
        │   │   └── pages
        │   │       ├── OrderDetailPage.jsx   # Detailed order view
        │   │       ├── OrderHistoryPage.jsx  # Completed/cancelled orders history
        │   │       ├── OrderNewPage.jsx      # Create sales order form
        │   │       ├── OrdersListPage.jsx    # Orders queue & status pipeline
        │   │       └── PartRequestsPage.jsx  # IM / SM Purchase Requests & PO Preview
        │   ├── parties
        │   │   └── pages
        │   │       ├── CustomersPage.jsx
        │   │       ├── PartiesListPage.jsx
        │   │       ├── PartyDetailPage.jsx
        │   │       └── PartyLedgerPage.jsx
        │   ├── payments
        │   │   └── pages
        │   │       ├── PaymentNewPage.jsx
        │   │       └── PaymentsListPage.jsx
        │   ├── pipeline
        │   │   ├── components
        │   │   │   └── PipelineBoard.jsx     # Role-based fulfillment kanban pipeline
        │   │   └── pages
        │   │       ├── AdminPipelinePage.jsx
        │   │       ├── DWPipelinePage.jsx
        │   │       ├── IMPipelinePage.jsx
        │   │       └── SMPipelinePage.jsx
        │   ├── prices
        │   │   └── pages
        │   │       └── PriceListPage.jsx     # Master price list with DL/SP prices & discounts
        │   ├── products
        │   │   └── pages
        │   │       ├── ProductCreatePage.jsx
        │   │       ├── ProductDetailPage.jsx
        │   │       └── ProductsListPage.jsx  # Catalog listing & CSV importer
        │   ├── regions
        │   │   └── pages
        │   │       └── RegionsPage.jsx       # Region management & IM assignees
        │   ├── reorder
        │   │   └── pages
        │   │       ├── MyReorderFlagsPage.jsx
        │   │       └── ReorderListPage.jsx
        │   ├── reports
        │   │   └── pages
        │   │       ├── BelowDlReportPage.jsx
        │   │       ├── PartHistoryPage.jsx    # Part transaction ledger & SKU suggestions
        │   │       ├── ReportsPage.jsx        # Reports dashboard hub
        │   │       ├── SalesReportPage.jsx
        │   │       ├── SalesmanReportPage.jsx
        │   │       ├── StockReportPage.jsx
        │   │       └── SupplierReportPage.jsx
        │   ├── settings
        │   │   └── pages
        │   │       └── SettingsPage.jsx       # Admin security PIN settings
        │   └── users
        │       └── pages
        │           ├── IMWorkersPage.jsx
        │           └── UsersListPage.jsx
        ├── router
        │   ├── AppRouter.jsx                # Main route configuration
        │   ├── ProtectedRoute.jsx           # Auth & Role verification guard
        │   ├── PublicRoute.jsx              # Unauthenticated user guard
        │   ├── RouteRetired.jsx             # Deprecated route redirect wrapper
        │   └── routes
        │       ├── adminRoutes.jsx          # /admin/* sub-routes
        │       ├── dwRoutes.jsx             # /dw/* sub-routes
        │       ├── imRoutes.jsx             # /im/* sub-routes
        │       └── smRoutes.jsx             # /sm/* sub-routes
        ├── socket
        │   └── socketClient.js              # Socket.io client setup & event emitters
        ├── store
        │   ├── authStore.js                 # Zustand state: user auth token & profile
        │   ├── notificationStore.js         # Unread count & notification items state
        │   └── themeStore.js                # Dark/light theme state
        └── utils
            ├── challanPrint.js              # Standard Shree Ramdev Motors Delivery Challan PDF/Print utility
            ├── cn.js                        # clsx & tailwind-merge helper
            ├── fileUtils.js                 # File downloader helpers
            ├── formatters.js                # Currency, Date & Number formatters
            ├── headerMatcher.js             # Intelligent CSV header mapping algorithms
            ├── orderUtils.js                # Order calculations
            ├── permissions.js               # Permission checking helpers
            ├── poPrint.js                   # Standard Shree Ramdev Motors Purchase Order PDF/Print utility
            ├── safeLazy.js                  # Dynamic chunk retry wrapper for code splitting
            ├── stockUtils.js                # Stock helpers
            └── validators.js                # Input validation helpers
```

---

## Key Modules & Responsibilities

1. **Challans Module (`src/modules/challans`)**:
   * Manages delivery challans across all roles.
   * `challanPrint.js`: Centralized printable HTML template for **Shree Ramdev Motors Delivery Challans** with direct browser printing and **"Save as PDF"** support.
   * Discounts are applied directly to Selling Price (SP) without additional GST calculation (DL includes GST).

2. **Inward & Purchase Orders Module (`src/modules/inward` & `src/modules/orders`)**:
   * Handles Purchase Order creation, PIN-secured approvals, editing, and cancellation.
   * `poPrint.js`: Centralized printable HTML template for **Shree Ramdev Motors Purchase Orders** with direct browser printing and **"Save as PDF"** support.

3. **Pipeline Board (`src/modules/pipeline`)**:
   * Multi-role workflow pipeline (`AdminPipelinePage`, `IMPipelinePage`, `SMPipelinePage`, `DWPipelinePage`).
   * Visualizes order status transitions: Pending → Approved → Packed → Dispatched → Delivered.
   * Enforces regional scoping so Inventory Managers only see dispatch workers from their assigned region.

4. **Part History & Reports (`src/modules/reports`)**:
   * `PartHistoryPage`: Complete ledger of all inward, outward, sales, and purchase transactions for any part number.
   * Real-time autocomplete suggestions from master catalog.
