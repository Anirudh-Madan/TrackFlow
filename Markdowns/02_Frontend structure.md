# FRONTEND_STRUCTURE.md
## Enterprise ERP — Frontend Architecture
### React 18 + Vite + Tailwind + React Router DOM + TanStack Query + Zustand

---

## Complete Folder Tree

```
└── frontend
    ├── .gitignore
    ├── dist
    │   ├── assets
    │   │   ├── arrow-left-CycgEpdv.js
    │   │   ├── AuditLogPage-CS2ZsCWc.js
    │   │   ├── calendar-BU63RiJu.js
    │   │   ├── ChallansListPage-D7LhQlHn.js
    │   │   ├── check-BlkWMwJy.js
    │   │   ├── clock-3-Boxqrz87.js
    │   │   ├── coerce-Nec5AujX.js
    │   │   ├── ComingSoon-BVIgbcQD.js
    │   │   ├── createLucideIcon-DyCq-HOk.js
    │   │   ├── DispatchQueuePage-CAarZe-v.js
    │   │   ├── funnel-BAVp0K_K.js
    │   │   ├── ImportHistoryPage-CGJy50yF.js
    │   │   ├── index-D28ySz9U.css
    │   │   ├── index-fP-tnhl0.js
    │   │   ├── Input-tr8Hramm.js
    │   │   ├── InwardDetailPage-B0kzKk_b.js
    │   │   ├── InwardListPage-D8KAo1Yk.js
    │   │   ├── InwardNewPage-B3xovQAQ.js
    │   │   ├── layers-DuzbocN7.js
    │   │   ├── Modal-CUUzGYow.js
    │   │   ├── NotificationsPage-DQbxvmDU.js
    │   │   ├── OrdersListPage-CAuaLq3e.js
    │   │   ├── PartiesListPage-C_rvbZWN.js
    │   │   ├── PartyDetailPage-C3CTj5Zl.js
    │   │   ├── PartyLedgerPage-CWORSLfs.js
    │   │   ├── PaymentsListPage-BKupojgP.js
    │   │   ├── pencil-BBngPNgE.js
    │   │   ├── phone-BB0r5mrs.js
    │   │   ├── PriceHistoryPage-67OYi1MF.js
    │   │   ├── ProductCreatePage-Mis69rX7.js
    │   │   ├── ProductDetailPage-CGo55luw.js
    │   │   ├── products.api-0Z0cQf0U.js
    │   │   ├── ProductsListPage-DpEuZH42.js
    │   │   ├── react-B8IZ02wI.js
    │   │   ├── regions.api-FqkDu07w.js
    │   │   ├── RegionsPage-BJLpCyJe.js
    │   │   ├── ReorderListPage-B6FZ9Qi6.js
    │   │   ├── SalesReportPage-CJzvbk__.js
    │   │   ├── StockOverviewPage-gmGqx88q.js
    │   │   ├── StockReportPage-DZGWrxRY.js
    │   │   ├── SuggestionConversionPage-DUAE7pfx.js
    │   │   ├── trash-2-C9MvtVSf.js
    │   │   ├── trending-down-Pl-J1Kui.js
    │   │   ├── users.api-B_yESfBM.js
    │   │   ├── UsersListPage-Dzsna1CC.js
    │   │   └── wrench-BY6Veu00.js
    │   ├── favicon.svg
    │   ├── icons.svg
    │   └── index.html
    ├── eslint.config.js
    ├── index.html
    ├── package-lock.json
    ├── package.json
    ├── postcss.config.js
    ├── public
    │   ├── favicon.svg
    │   └── icons.svg
    ├── README.md
    ├── src
    │   ├── api
    │   │   ├── client.js           # Axios instance: base URL /api/v1, interceptors
    │   │   ├── endpoints
    │   │   │   ├── audit.api.js
    │   │   │   ├── auth.api.js
    │   │   │   ├── challans.api.js
    │   │   │   ├── dispatch.api.js
    │   │   │   ├── inventory.api.js
    │   │   │   ├── inward.api.js
    │   │   │   ├── notifications.api.js
    │   │   │   ├── orders.api.js
    │   │   │   ├── parties.api.js
    │   │   │   ├── payments.api.js
    │   │   │   ├── prices.api.js
    │   │   │   ├── products.api.js
    │   │   │   ├── regions.api.js
    │   │   │   ├── reorder.api.js
    │   │   │   ├── reports.api.js
    │   │   │   └── users.api.js
    │   │   └── interceptors
    │   │       ├── authInterceptor.js # TODO: placeholder (auth is inline in client.js)
    │   │       └── refreshInterceptor.js # Auto-refresh token on 401 (skips /auth/login)
    │   ├── App.css                 # Global app-level CSS overrides
    │   ├── App.jsx                 # Root component, theme toggle effect
    │   ├── assets
    │   │   ├── hero.png            # Hero/branding image
    │   │   ├── react.svg
    │   │   └── vite.svg
    │   ├── components
    │   │   ├── data
    │   │   │   ├── DataTable.jsx   # Sortable, paginated, filterable table
    │   │   │   ├── PaymentAgeingBadge.jsx # Green/amber/red payment ageing
    │   │   │   ├── StatCard.jsx    # Dashboard metric card
    │   │   │   ├── StatusBadge.jsx # Order/dispatch/stock status chips
    │   │   │   ├── StockBadge.jsx  # In Stock / Low Stock / Out of Stock
    │   │   │   ├── TableFilters.jsx # Filter bar (status, date, search)
    │   │   │   └── TablePagination.jsx # Pagination controls
    │   │   ├── feedback
    │   │   │   ├── ConfirmDialog.jsx # "Are you sure?" confirmation modal
    │   │   │   ├── ErrorBoundary.jsx # React error boundary with fallback UI
    │   │   │   └── Toast.jsx       # Toast notification (success/error/info)
    │   │   ├── form
    │   │   │   ├── FormDatePicker.jsx # Date picker
    │   │   │   ├── FormField.jsx   # Label + input + error message wrapper
    │   │   │   ├── FormFileUpload.jsx # Drag-drop file upload with preview
    │   │   │   ├── FormSearchSelect.jsx # Async search select (for products/parties)
    │   │   │   ├── FormSelect.jsx  # RHF-connected select
    │   │   │   └── FormTextarea.jsx # RHF-connected textarea
    │   │   ├── layout
    │   │   │   ├── Breadcrumb.jsx  # Auto-generated from route
    │   │   │   ├── GlobalSearch.jsx # Command-palette-style global search
    │   │   │   ├── NotificationBell.jsx # Bell icon with unread count
    │   │   │   ├── ProfileMenu.jsx # Avatar dropdown: profile, theme, logout
    │   │   │   ├── Sidebar.jsx     # Collapsible sidebar shell
    │   │   │   ├── SidebarGroup.jsx # Grouped nav section with header
    │   │   │   ├── SidebarItem.jsx # Single nav item with icon, label, badge
    │   │   │   └── TopNavbar.jsx   # Top bar: breadcrumbs, search, bell, avatar
    │   │   └── ui
    │   │       ├── Alert.jsx       # Info/warning/error/success banners
    │   │       ├── Badge.jsx       # Status badges (green/amber/red/gray)
    │   │       ├── Button.jsx      # Primary, secondary, ghost, danger variants
    │   │       ├── Card.jsx        # Content card container
    │   │       ├── Checkbox.jsx
    │   │       ├── ComingSoon.jsx  # Placeholder page for unimplemented modules
    │   │       ├── Divider.jsx
    │   │       ├── Drawer.jsx      # Right-side slide-over panel
    │   │       ├── EmptyState.jsx  # Empty table/list state with CTA
    │   │       ├── Input.jsx       # Text input with label, error, helper
    │   │       ├── Modal.jsx       # Accessible modal dialog
    │   │       ├── Select.jsx      # Dropdown select
    │   │       ├── Skeleton.jsx    # Loading skeleton for tables/cards
    │   │       ├── Spinner.jsx     # Loading spinner
    │   │       ├── Tabs.jsx
    │   │       ├── Textarea.jsx
    │   │       └── Tooltip.jsx
    │   ├── constants
    │   │   ├── dispatchStatuses.js
    │   │   ├── orderStatuses.js    # Order status constants + labels
    │   │   ├── paymentModes.js
    │   │   ├── reorderStatuses.js
    │   │   ├── roles.js            # Role string constants
    │   │   ├── socketEvents.js     # Mirrors socket/socketEvents.js (shared)
    │   │   └── stockStates.js
    │   ├── hooks
    │   │   ├── useConfirm.js       # Trigger confirm dialog, returns Promise
    │   │   ├── useDebounce.js      # Debounce hook for search inputs
    │   │   ├── usePagination.js    # Shared pagination state + params builder
    │   │   ├── usePermission.js    # Check if current user has a permission code
    │   │   ├── useTableFilters.js  # Filter state management for DataTable
    │   │   └── useToast.js         # Trigger toast notifications
    │   ├── index.css               # Tailwind directives + custom base styles
    │   ├── layouts
    │   │   ├── AdminLayout.jsx     # Admin shell: topnav + sidebar + content
    │   │   ├── AuthLayout.jsx      # Login/password pages (no sidebar)
    │   │   ├── DWLayout.jsx        # DW shell: topnav + sidebar + content
    │   │   ├── IMLayout.jsx        # IM shell: topnav + sidebar + content
    │   │   └── SMLayout.jsx        # SM shell: topnav + sidebar + content
    │   ├── main.jsx                # App entry point, providers setup
    │   ├── modules
    │   │   ├── audit
    │   │   │   ├── components
    │   │   │   │   └── AuditLogTable.jsx
    │   │   │   ├── hooks
    │   │   │   │   └── useAuditLogs.js
    │   │   │   └── pages
    │   │   │       └── AuditLogPage.jsx # Admin only
    │   │   ├── auth
    │   │   │   ├── components
    │   │   │   │   └── LoginForm.jsx # TODO: extracted form component
    │   │   │   ├── hooks
    │   │   │   │   └── useLogin.js # TODO: login mutation hook (currently inline in page)
    │   │   │   └── pages
    │   │   │       ├── ChangePasswordPage.jsx # Password change (first-login or manual)
    │   │   │       └── LoginPage.jsx # Login form
    │   │   ├── challans
    │   │   │   ├── components
    │   │   │   │   ├── ChallanPdfButton.jsx # Triggers PDF download API
    │   │   │   │   └── ChallanTable.jsx
    │   │   │   ├── hooks
    │   │   │   │   └── useChallans.js
    │   │   │   └── pages
    │   │   │       ├── ChallanDetailPage.jsx # Full challan view + PDF download
    │   │   │       └── ChallansListPage.jsx
    │   │   ├── dashboard
    │   │   │   ├── admin
    │   │   │   │   ├── AdminDashboard.jsx
    │   │   │   │   └── widgets
    │   │   │   │       ├── CreditAlertWidget.jsx
    │   │   │   │       ├── LowStockWidget.jsx
    │   │   │   │       ├── OrderSummaryWidget.jsx
    │   │   │   │       ├── RecentAuditWidget.jsx
    │   │   │   │       ├── ReorderSummaryWidget.jsx
    │   │   │   │       ├── Stock1CleanupWidget.jsx
    │   │   │   │       └── SuggestionConversionWidget.jsx
    │   │   │   ├── dw
    │   │   │   │   ├── DWDashboard.jsx
    │   │   │   │   └── widgets
    │   │   │   │       ├── AssignedChallansWidget.jsx
    │   │   │   │       └── DispatchedTodayWidget.jsx
    │   │   │   ├── im
    │   │   │   │   ├── IMDashboard.jsx
    │   │   │   │   └── widgets
    │   │   │   │       ├── InwardTodayWidget.jsx
    │   │   │   │       ├── LowStockWidget.jsx
    │   │   │   │       ├── PendingOrdersWidget.jsx
    │   │   │   │       └── ReorderWidget.jsx
    │   │   │   ├── RolePlaceholderPage.jsx # Fallback page for roles without a dashboard yet
    │   │   │   └── sm
    │   │   │       ├── SMDashboard.jsx
    │   │   │       └── widgets
    │   │   │           ├── MyOrdersWidget.jsx
    │   │   │           ├── MyReorderFlagsWidget.jsx
    │   │   │           ├── OverduePartiesWidget.jsx
    │   │   │           └── PricingSummaryWidget.jsx
    │   │   ├── dispatch
    │   │   │   ├── components
    │   │   │   │   ├── ChallanPickList.jsx # Rack location + pick checkbox per item
    │   │   │   │   └── DispatchTable.jsx
    │   │   │   ├── hooks
    │   │   │   │   ├── useDispatches.js
    │   │   │   │   └── useDispatchMutations.js
    │   │   │   └── pages
    │   │   │       ├── DispatchPickPage.jsx # DW: item-by-item picking interface
    │   │   │       ├── DispatchQueuePage.jsx # DW: list of assigned challans
    │   │   │       └── DispatchSummaryPage.jsx # Daily summary PDF download
    │   │   ├── inventory
    │   │   │   ├── components
    │   │   │   │   ├── StockSplitBadge.jsx # Stock1 | Stock2 display for IM/Admin
    │   │   │   │   └── StockTable.jsx # Shows combined or split depending on role
    │   │   │   ├── hooks
    │   │   │   │   └── useStock.js
    │   │   │   └── pages
    │   │   │       └── StockCleanupPage.jsx # Admin: Stock1/Stock2 cleanup tool
    │   │   ├── inward
    │   │   │   ├── components
    │   │   │   │   ├── InwardEntryForm.jsx # Header + dynamic line items
    │   │   │   │   ├── InwardHistoryTable.jsx
    │   │   │   │   └── InwardLineItem.jsx # Part search + qty + inline create
    │   │   │   ├── hooks
    │   │   │   │   ├── useInwardEntries.js
    │   │   │   │   └── useInwardMutations.js
    │   │   │   └── pages
    │   │   │       ├── InwardDetailPage.jsx
    │   │   │       ├── InwardListPage.jsx
    │   │   │       └── InwardNewPage.jsx
    │   │   ├── notifications
    │   │   │   ├── components
    │   │   │   │   ├── NotificationItem.jsx
    │   │   │   │   └── NotificationList.jsx
    │   │   │   ├── hooks
    │   │   │   │   └── useNotifications.js
    │   │   │   └── pages
    │   │   │       └── NotificationsPage.jsx # Full notification history
    │   │   ├── orders
    │   │   │   ├── components
    │   │   │   │   ├── OrderBuilder
    │   │   │   │   │   ├── OrderBuilder.jsx # Parent: party select + items + submit
    │   │   │   │   │   ├── OrderItemList.jsx # Dynamic list of rows
    │   │   │   │   │   ├── OrderItemRow.jsx # Product search + base price + SM price
    │   │   │   │   │   ├── OrderSummary.jsx # Totals, GST, submit button
    │   │   │   │   │   ├── PartySelector.jsx # Searchable party dropdown
    │   │   │   │   │   └── SmartSuggestionPanel.jsx # Suggestion cards with + Add
    │   │   │   │   ├── OrderFlagModal.jsx # IM: flag with reason
    │   │   │   │   ├── OrderReturnModal.jsx # Admin/IM: return/cancel with reason
    │   │   │   │   ├── OrderStatusTrail.jsx # Visual status timeline
    │   │   │   │   └── OrderTable.jsx
    │   │   │   ├── hooks
    │   │   │   │   ├── useOrderMutations.js
    │   │   │   │   └── useOrders.js
    │   │   │   └── pages
    │   │   │       ├── OrderDetailPage.jsx # View + actions (approve/flag/dispatch)
    │   │   │       ├── OrderHistoryPage.jsx # SM: own past orders, clone action
    │   │   │       ├── OrderNewPage.jsx # SM: full order builder
    │   │   │       └── OrdersListPage.jsx # All orders (Admin/IM) or own (SM)
    │   │   ├── parties
    │   │   │   ├── components
    │   │   │   │   ├── CreditLimitBanner.jsx # Inline credit warning during order
    │   │   │   │   ├── PartyForm.jsx
    │   │   │   │   ├── PartyLedger.jsx # Orders + payments timeline
    │   │   │   │   ├── PartyOrderHistory.jsx # Last N orders for SM field use
    │   │   │   │   └── PartyTable.jsx
    │   │   │   ├── hooks
    │   │   │   │   ├── useParties.js
    │   │   │   │   └── usePartyMutations.js
    │   │   │   └── pages
    │   │   │       ├── PartiesListPage.jsx
    │   │   │       ├── PartyDetailPage.jsx # Ledger, order history, credit info
    │   │   │       └── PartyImportPage.jsx # Excel import flow
    │   │   ├── payments
    │   │   │   ├── components
    │   │   │   │   ├── AgeingBadge.jsx # Green/amber/red ageing indicator
    │   │   │   │   ├── PaymentForm.jsx
    │   │   │   │   └── PaymentTable.jsx
    │   │   │   ├── hooks
    │   │   │   │   ├── usePaymentMutations.js
    │   │   │   │   └── usePayments.js
    │   │   │   └── pages
    │   │   │       ├── PartyLedgerPage.jsx
    │   │   │       ├── PaymentNewPage.jsx
    │   │   │       └── PaymentsListPage.jsx
    │   │   ├── prices
    │   │   │   ├── components
    │   │   │   │   ├── PriceHistoryTable.jsx
    │   │   │   │   ├── PricePreviewTable.jsx # Old / New / Change% with row deselect
    │   │   │   │   └── PriceUploadForm.jsx
    │   │   │   ├── hooks
    │   │   │   │   └── usePrices.js
    │   │   │   └── pages
    │   │   │       ├── PriceHistoryPage.jsx
    │   │   │       └── PriceUpdatePage.jsx # Upload → preview → confirm flow
    │   │   ├── products
    │   │   │   ├── components
    │   │   │   │   ├── ProductForm.jsx # Includes all custom Admin fields
    │   │   │   │   ├── ProductSearchSelect.jsx # Async search used in order screen
    │   │   │   │   └── ProductTable.jsx
    │   │   │   ├── hooks
    │   │   │   │   ├── useProductMutations.js
    │   │   │   │   └── useProducts.js
    │   │   │   └── pages
    │   │   │       ├── ProductCreatePage.jsx # Dedicated product creation page
    │   │   │       ├── ProductDetailPage.jsx
    │   │   │       ├── ProductImportPage.jsx
    │   │   │       └── ProductsListPage.jsx
    │   │   ├── regions
    │   │   │   ├── components
    │   │   │   │   ├── RegionForm.jsx
    │   │   │   │   └── RegionTable.jsx
    │   │   │   ├── hooks
    │   │   │   │   └── useRegions.js
    │   │   │   └── pages
    │   │   │       └── RegionsPage.jsx
    │   │   ├── reorder
    │   │   │   ├── components
    │   │   │   │   ├── ReorderFlagModal.jsx # SM: flag item modal (qty + note)
    │   │   │   │   ├── ReorderStatusBadge.jsx # Open / Ordered / Received
    │   │   │   │   └── ReorderTable.jsx
    │   │   │   ├── hooks
    │   │   │   │   ├── useReorderList.js
    │   │   │   │   └── useReorderMutations.js
    │   │   │   └── pages
    │   │   │       ├── MyReorderFlagsPage.jsx # SM: own flags
    │   │   │       └── ReorderListPage.jsx # IM/Admin: consolidated list
    │   │   ├── reports
    │   │   │   ├── hooks
    │   │   │   │   └── useReports.js
    │   │   │   └── pages
    │   │   │       ├── ImportHistoryPage.jsx
    │   │   │       ├── SalesReportPage.jsx
    │   │   │       ├── StockReportPage.jsx
    │   │   │       └── SuggestionConversionPage.jsx
    │   │   └── users
    │   │       ├── components
    │   │       │   ├── UserForm.jsx
    │   │       │   └── UserTable.jsx
    │   │       ├── hooks
    │   │       │   ├── useUserMutations.js # create, update, deactivate
    │   │       │   └── useUsers.js # TanStack Query: list + fetch
    │   │       └── pages
    │   │           ├── RoleDetailPage.jsx # Role detail / permission viewer
    │   │           ├── RolesListPage.jsx # Roles listing (Admin only)
    │   │           ├── UserCreatePage.jsx
    │   │           ├── UserEditPage.jsx
    │   │           └── UsersListPage.jsx # User management table + create/edit modals
    │   ├── router
    │   │   ├── guards
    │   │   │   ├── AuthGuard.jsx   # Redirects unauthenticated users to /login
    │   │   │   ├── FirstLoginGuard.jsx # Bypassed: placeholder for future first-login enforcement
    │   │   │   └── RoleGuard.jsx   # Redirects users accessing wrong role routes
    │   │   ├── index.jsx           # Root router definition
    │   │   └── routes
    │   │       ├── adminRoutes.jsx # All /admin/* route definitions
    │   │       ├── dwRoutes.jsx    # All /dw/* route definitions
    │   │       ├── imRoutes.jsx    # All /im/* route definitions
    │   │       └── smRoutes.jsx    # All /sm/* route definitions
    │   ├── socket
    │   │   ├── socketClient.js     # Socket.io instance, connect/disconnect
    │   │   ├── socketEvents.js     # Mirrors socket/socketEvents.js (shared)
    │   │   └── useSocket.js        # React hook: subscribe to events, cleanup
    │   ├── store
    │   │   ├── authStore.js        # user, accessToken, isAuthenticated
    │   │   ├── notificationStore.js # unreadCount, latestNotification
    │   │   └── uiStore.js          # sidebarCollapsed, theme, globalLoading
    │   ├── theme
    │   │   ├── darkMode.js         # Dark/light mode toggle logic
    │   │   └── tokens.js           # Color, spacing, typography tokens
    │   └── utils
    │       ├── cn.js               # clsx + tailwind-merge helper (className util)
    │       ├── fileUtils.js        # File size, type validation for uploads
    │       ├── formatters.js       # Currency, date, number formatters
    │       ├── orderUtils.js       # Order status label/color helpers
    │       ├── permissions.js      # Permission map parser + lookup helpers
    │       ├── stockUtils.js       # Stock state color/label helpers
    │       └── validators.js       # Client-side validation helpers
    ├── tailwind.config.js
    └── vite.config.js
```

---

## Route Architecture

### Router Setup
React Router DOM v6 with `createBrowserRouter` + `RouterProvider`. Layouts are implemented as route wrappers — each role has its own layout that renders `<Outlet />` for child pages.

```
createBrowserRouter([
  { path: '/login', element: <AuthLayout><LoginPage /></AuthLayout> },
  { path: '/change-password', element: <AuthLayout><ChangePasswordPage /></AuthLayout> },
  {
    path: '/admin',
    element: <AuthGuard><RoleGuard role="admin"><AdminLayout /></RoleGuard></AuthGuard>,
    children: [ ...adminRoutes ]
  },
  {
    path: '/sm',
    element: <AuthGuard><RoleGuard role="sales_manager"><SMLayout /></RoleGuard></AuthGuard>,
    children: [ ...smRoutes ]
  },
  // ... im, dw
])
```

### Guards Behavior
- **AuthGuard:** Reads `isAuthenticated` from Zustand authStore. Redirects to `/login` if false.
- **RoleGuard:** Reads `user.role` from authStore. Redirects to appropriate role root if mismatched.
- **FirstLoginGuard:** Reads `user.must_change_password`. Redirects all routes except `/change-password` to that page until complete.

### Lazy Loading
All module pages are lazy-loaded using `React.lazy()` + `Suspense`. Each module bundle is code-split. Dashboard and auth pages are eagerly loaded (small, always needed).

---

## Layouts

Each role layout is structurally identical but renders a different sidebar configuration:

```
<div class="flex h-screen bg-slate-50 dark:bg-slate-900">
  <Sidebar items={roleSpecificNavItems} />
  <div class="flex flex-col flex-1 overflow-hidden">
    <TopNavbar />
    <main class="flex-1 overflow-y-auto p-6">
      <Breadcrumb />
      <Outlet />
    </main>
  </div>
</div>
```

The sidebar nav items array is built from the user's permission set at login — not hardcoded per role. If a permission is removed from a role, that nav item disappears without any code change.

---

## Shared Components — Design Decisions

### DataTable
The central component of this ERP. Features:
- Column sorting (click header → toggle asc/desc)
- Server-side pagination (page, limit, sort sent to API)
- Column-level filter support
- Row selection (checkbox) for bulk actions
- Loading skeleton (not spinner) while fetching
- Empty state with role-appropriate CTA
- Sticky header on scroll
- Responsive: horizontal scroll on mobile

### GlobalSearch
Command-palette style (Cmd/Ctrl + K). Searches across parties, products, orders, challans. Results grouped by entity type. Keyboard-navigable. Role-filtered: SM only sees their own orders and parties.

### NotificationBell
- Badge with unread count (database-driven, not socket-only)
- Dropdown panel: last 5 notifications with mark-read
- "View all" link to `/notifications`
- Real-time update via socket event → Zustand `notificationStore.unreadCount`

---

## API Layer

### Axios Client Setup (`api/client.js`)
```js
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});
```
- Auth interceptor attaches `Authorization: Bearer {accessToken}` from authStore.
- Response interceptor: on 401, attempts token refresh via `/api/v1/auth/refresh`, retries original request, or logs out if refresh fails.

### Endpoint Files
Each endpoint file exports async functions that call `apiClient`. They do not contain business logic — they are pure HTTP wrappers.

```js
// orders.api.js
export const getOrders = (params) => apiClient.get('/orders', { params });
export const getOrder = (id) => apiClient.get(`/orders/${id}`);
export const createOrder = (data) => apiClient.post('/orders', data);
export const approveOrder = (id) => apiClient.patch(`/orders/${id}/approve`);
```

### TanStack Query Usage
All data fetching uses `useQuery` and `useMutation`. Cache keys are structured:
```js
['orders', filters]           // list with filters
['orders', orderId]           // single item
['parties', partyId, 'ledger'] // nested resource
```

---

## Socket Layer

### `socketClient.js`
Creates a single Socket.io client instance. Connects after successful auth with the access token. Disconnects on logout. Reconnects automatically with exponential backoff.

### `useSocket.js`
```js
// Usage in any component:
useSocket('order:approved', (data) => {
  toast.success(`Order ${data.orderNumber} approved!`);
  queryClient.invalidateQueries(['orders']);
});
```
The hook registers the event listener on mount and cleans up on unmount. No memory leaks.

---

## State Management

### authStore (Zustand)
```js
{
  user: null,          // { id, name, role, permissions: Set<string> }
  accessToken: null,
  isAuthenticated: false,
  setUser: (user, token) => {},
  logout: () => {},
  hasPermission: (code) => state.user?.permissions.has(code)
}
```

### uiStore (Zustand)
```js
{
  sidebarCollapsed: false,
  theme: 'light',      // 'light' | 'dark'
  toggleSidebar: () => {},
  toggleTheme: () => {}
}
```

### notificationStore (Zustand)
```js
{
  unreadCount: 0,
  setUnreadCount: (n) => {},
  incrementUnread: () => {},
  resetUnread: () => {}
}
```

---

## Themes & Styling

### Color Palette (Tailwind Config)
```js
colors: {
  // Primary: Indigo
  primary: { 50: '#eef2ff', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca' },
  // Surface: Slate
  surface: { 50: '#f8fafc', 100: '#f1f5f9', 800: '#1e293b', 900: '#0f172a' },
  // Success: Emerald
  success: { 100: '#d1fae5', 500: '#10b981', 700: '#047857' },
  // Warning: Amber
  warning: { 100: '#fef3c7', 500: '#f59e0b', 700: '#b45309' },
  // Danger: Red
  danger: { 100: '#fee2e2', 500: '#ef4444', 700: '#b91c1c' },
}
```

### Dark Mode
Class-based (`dark:` prefix). Toggle stored in Zustand `uiStore.theme`, persisted to `localStorage`. Applied to `<html>` element via a `useEffect` in `App.jsx`.

### Typography
Inter font (self-hosted). Used for all text. Monospace font (JetBrains Mono) for part numbers, challan numbers, audit values.

---

## Animations

Minimal and purposeful:
- Sidebar collapse/expand: `transition-width duration-200`
- Modal open/close: fade + scale (Headless UI Transition)
- Toast: slide in from right (Framer Motion, lightweight usage)
- Table row hover: `transition-colors duration-100`
- No page transition animations — ERP users value speed over spectacle.
