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
    │   │   │   ├── analytics.api.js
    │   │   │   ├── audit.api.js
    │   │   │   ├── auth.api.js
    │   │   │   ├── challans.api.js
    │   │   │   ├── dispatch.api.js
    │   │   │   ├── inventory.api.js
    │   │   │   ├── inward.api.js
    │   │   │   ├── notifications.api.js
    │   │   │   ├── orders.api.js
    │   │   │   ├── partRequests.api.js
    │   │   │   ├── parties.api.js
    │   │   │   ├── payments.api.js
    │   │   │   ├── pipeline.api.js
    │   │   │   ├── prices.api.js
    │   │   │   ├── products.api.js  # API wrapper: includes bulkImportProducts endpoint
    │   │   │   ├── purchaseOrders.api.js
    │   │   │   ├── rbac.api.js
    │   │   │   ├── regions.api.js
    │   │   │   ├── reorder.api.js
    │   │   │   ├── reports.api.js
    │   │   │   └── users.api.js
    │   │   └── interceptors
    │   │       ├── authInterceptor.js
    │   │       └── refreshInterceptor.js
    │   ├── App.css
    │   ├── App.jsx
    │   ├── assets
    │   │   ├── hero.png
    │   │   ├── react.svg
    │   │   └── vite.svg
    │   ├── components
    │   │   ├── data
    │   │   │   ├── DataTable.jsx
    │   │   │   ├── PaymentAgeingBadge.jsx
    │   │   │   ├── StatCard.jsx
    │   │   │   ├── StatusBadge.jsx
    │   │   │   ├── StockBadge.jsx
    │   │   │   ├── TableFilters.jsx
    │   │   │   └── TablePagination.jsx
    │   │   ├── feedback
    │   │   │   ├── ConfirmDialog.jsx
    │   │   │   ├── ErrorBoundary.jsx
    │   │   │   └── Toast.jsx
    │   │   ├── form
    │   │   │   ├── FormDatePicker.jsx
    │   │   │   ├── FormField.jsx
    │   │   │   ├── FormFileUpload.jsx
    │   │   │   ├── FormSearchSelect.jsx
    │   │   │   ├── FormSelect.jsx
    │   │   │   └── FormTextarea.jsx
    │   │   ├── layout
    │   │   │   ├── Breadcrumb.jsx
    │   │   │   ├── GlobalSearch.jsx
    │   │   │   ├── NotificationBell.jsx
    │   │   │   ├── ProfileMenu.jsx
    │   │   │   ├── Sidebar.jsx
    │   │   │   ├── SidebarGroup.jsx
    │   │   │   ├── SidebarItem.jsx
    │   │   │   └── TopNavbar.jsx
    │   │   └── ui
    │   │       ├── Alert.jsx
    │   │       ├── Badge.jsx
    │   │       ├── Button.jsx
    │   │       ├── Card.jsx
    │   │       ├── Checkbox.jsx
    │   │       ├── ComingSoon.jsx
    │   │       ├── Divider.jsx
    │   │       ├── Drawer.jsx
    │   │       ├── EmptyState.jsx
    │   │       ├── Input.jsx
    │   │       ├── Modal.jsx
    │   │       ├── Select.jsx
    │   │       ├── Skeleton.jsx
    │   │       ├── Spinner.jsx
    │   │       ├── Tabs.jsx
    │   │       ├── Textarea.jsx
    │   │       └── Tooltip.jsx
    │   ├── constants
    │   │   ├── dispatchStatuses.js
    │   │   ├── orderStatuses.js
    │   │   ├── paymentModes.js
    │   │   ├── reorderStatuses.js
    │   │   ├── roles.js
    │   │   ├── socketEvents.js
    │   │   └── stockStates.js
    │   ├── hooks
    │   │   ├── useConfirm.js
    │   │   ├── useDebounce.js
    │   │   ├── usePagination.js
    │   │   ├── usePermission.js
    │   │   ├── useTableFilters.js
    │   │   └── useToast.js
    │   ├── index.css
    │   ├── layouts
    │   │   ├── AdminLayout.jsx
    │   │   ├── AuthLayout.jsx
    │   │   ├── DWLayout.jsx
    │   │   ├── IMLayout.jsx
    │   │   └── SMLayout.jsx
    │   ├── main.jsx
    │   ├── modules
    │   │   ├── audit
    │   │   │   ├── components
    │   │   │   │   └── AuditLogTable.jsx
    │   │   │   ├── hooks
    │   │   │   │   └── useAuditLogs.js
    │   │   │   └── pages
    │   │   │       └── AuditLogPage.jsx # Admin only (Placeholder; ComingSoon)
    │   │   ├── auth
    │   │   │   ├── components
    │   │   │   │   └── LoginForm.jsx # TODO: extracted form component
    │   │   │   ├── hooks
    │   │   │   │   └── useLogin.js # TODO: login mutation hook
    │   │   │   └── pages
    │   │   │       ├── ChangePasswordPage.jsx # Password change
    │   │   │       └── LoginPage.jsx # Login form
    │   │   ├── challans
    │   │   │   ├── components
    │   │   │   │   ├── ChallanPdfButton.jsx # Triggers PDF download API
    │   │   │   │   └── ChallanTable.jsx
    │   │   │   ├── hooks
    │   │   │   │   └── useChallans.js
    │   │   │   └── pages
    │   │   │       ├── ChallanDetailPage.jsx
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
    │   │   │   ├── RolePlaceholderPage.jsx # Fallback page
    │   │   │   └── sm
    │   │   │       ├── SMDashboard.jsx
    │   │   │       └── widgets
    │   │   │           ├── MyOrdersWidget.jsx
    │   │   │           ├── MyReorderFlagsWidget.jsx
    │   │   │           ├── OverduePartiesWidget.jsx
    │   │   │           └── PricingSummaryWidget.jsx
    │   │   ├── dispatch
    │   │   │   ├── components
    │   │   │   │   ├── ChallanPickList.jsx
    │   │   │   │   └── DispatchTable.jsx
    │   │   │   ├── hooks
    │   │   │   │   ├── useDispatches.js
    │   │   │   │   └── useDispatchMutations.js
    │   │   │   └── pages
    │   │   │       ├── DispatchPickPage.jsx
    │   │   │       ├── DispatchQueuePage.jsx
    │   │   │       └── DispatchSummaryPage.jsx
    │   │   ├── inventory
    │   │   │   ├── components
    │   │   │   │   ├── StockSplitBadge.jsx
    │   │   │   │   └── StockTable.jsx
    │   │   │   ├── hooks
    │   │   │   │   └── useStock.js
    │   │   │   └── pages
    │   │   │       └── StockCleanupPage.jsx
    │   │   ├── inward
    │   │   │   ├── components
    │   │   │   │   ├── InwardEntryForm.jsx
    │   │   │   │   ├── InwardHistoryTable.jsx
    │   │   │   │   └── InwardLineItem.jsx
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
    │   │   │       └── NotificationsPage.jsx
    │   │   ├── orders
    │   │   │   ├── components
    │   │   │   │   ├── OrderBuilder
    │   │   │   │   │   ├── OrderBuilder.jsx
    │   │   │   │   │   ├── OrderItemList.jsx
    │   │   │   │   │   ├── OrderItemRow.jsx
    │   │   │   │   │   ├── OrderSummary.jsx
    │   │   │   │   │   ├── PartySelector.jsx
    │   │   │   │   │   └── SmartSuggestionPanel.jsx
    │   │   │   │   ├── OrderFlagModal.jsx
    │   │   │   │   ├── OrderReturnModal.jsx
    │   │   │   │   ├── OrderStatusTrail.jsx
    │   │   │   │   └── OrderTable.jsx
    │   │   │   ├── hooks
    │   │   │   │   ├── useOrderMutations.js
    │   │   │   │   └── useOrders.js
    │   │   │   └── pages
    │   │   │       ├── OrderDetailPage.jsx
    │   │   │       ├── OrderHistoryPage.jsx
    │   │   │       ├── OrderNewPage.jsx
    │   │   │       └── OrdersListPage.jsx
    │   │   ├── parties
    │   │   │   ├── components
    │   │   │   │   ├── CreditLimitBanner.jsx
    │   │   │   │   ├── PartyForm.jsx
    │   │   │   │   ├── PartyLedger.jsx
    │   │   │   │   ├── PartyOrderHistory.jsx
    │   │   │   │   └── PartyTable.jsx
    │   │   │   ├── hooks
    │   │   │   │   ├── useParties.js
    │   │   │   │   └── usePartyMutations.js
    │   │   │   └── pages
    │   │   │       ├── PartiesListPage.jsx
    │   │   │       ├── PartyDetailPage.jsx
    │   │   │       └── PartyImportPage.jsx # Placeholder (returns null; actual excel logic is in specific pages)
    │   │   ├── payments
    │   │   │   ├── components
    │   │   │   │   ├── AgeingBadge.jsx
    │   │   │   │   ├── PaymentForm.jsx
    │   │   │   │   └── PaymentTable.jsx
    │   │   │   ├── hooks
    │   │   │   │   ├── usePaymentMutations.js
    │   │   │   │   └── usePayments.js
    │   │   │   └── pages
    │   │   │       ├── PartyLedgerPage.jsx
    │   │   │       ├── PaymentNewPage.jsx
    │   │   │       └── PaymentsListPage.jsx
    │   │   ├── pipeline
    │   │   │   ├── components
    │   │   │   ├── constants.js
    │   │   │   └── pages
    │   │   │       ├── AdminPipelinePage.jsx
    │   │   │       ├── DWPipelinePage.jsx
    │   │   │       ├── IMPipelinePage.jsx
    │   │   │       ├── IMRequestsPage.jsx
    │   │   │       ├── IMWorkersPage.jsx
    │   │   │       ├── SMPipelinePage.jsx
    │   │   │       └── SMRequestsPage.jsx
    │   │   ├── prices
    │   │   │   ├── components
    │   │   │   │   ├── PriceHistoryTable.jsx
    │   │   │   │   ├── PricePreviewTable.jsx
    │   │   │   │   └── PriceUploadForm.jsx
    │   │   │   ├── hooks
    │   │   │   │   └── usePrices.js
    │   │   │   └── pages
    │   │   │       ├── PriceHistoryPage.jsx
    │   │   │       ├── PriceListPage.jsx   # Core prices list, inline updates, and Excel/CSV import flow using SheetJS (XLSX.read) client-side
    │   │   │       └── PriceUpdatePage.jsx # Placeholder (returns null)
    │   │   ├── products
    │   │   │   ├── components
    │   │   │   │   ├── ProductForm.jsx
    │   │   │   │   ├── ProductSearchSelect.jsx
    │   │   │   │   └── ProductTable.jsx
    │   │   │   ├── hooks
    │   │   │   │   ├── useProductMutations.js
    │   │   │   │   └── useProducts.js
    │   │   │   └── pages
    │   │   │       ├── ProductCreatePage.jsx
    │   │   │       ├── ProductDetailPage.jsx
    │   │   │       ├── ProductImportPage.jsx # Placeholder (returns null)
    │   │   │       └── ProductsListPage.jsx  # Core product table and bulk Excel/CSV product import flow using SheetJS (XLSX.read) client-side
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

---

## Excel / CSV Import Flow

The Excel and CSV import feature is implemented entirely client-side for parsing and verification, sending the clean JSON payload to the backend for transaction-wrapped database inserts and audits.

### Core Handling Files
1. **[ProductsListPage.jsx](file:///c:/Users/sreed/OneDrive/Desktop/TrackFlow/frontend/src/modules/products/pages/ProductsListPage.jsx)**:
   - Implements React Dropzone (`useDropzone`) for dragging and dropping `.xlsx`, `.xls`, or `.csv` files.
   - Reads files as an array buffer (`FileReader.readAsArrayBuffer`) for Excel or text (`FileReader.readAsText`) for CSV.
   - Uses **SheetJS** (`XLSX.read` and `XLSX.utils.sheet_to_json`) for parsing Excel workbooks.
   - Uses a local `parseCSV` function for CSV text files.
   - Dynamically maps variant headers (e.g., `sku_code`, `part_number` -> `sku`) to standard internal properties.
   - Performs client-side validation (against product lookup dictionaries) to identify validation errors, categorizing products as "new" or "existing" to prepare the payload.
   - Triggers the `bulkImportProducts` API utility.
2. **[PriceListPage.jsx](file:///c:/Users/sreed/OneDrive/Desktop/TrackFlow/frontend/src/modules/prices/pages/PriceListPage.jsx)**:
   - Follows the identical parsing structure as the products list page for import dropzone handling, SheetJS integration, and custom CSV parsing.
   - Focuses validation on pricing attributes (DN Price, DL Price, GST %, Description).
   - Dynamically detects the pricing format structure and validates inputs.
   - Hits the same bulk import endpoint via the shared api helper.
3. **[products.api.js](file:///c:/Users/sreed/OneDrive/Desktop/TrackFlow/frontend/src/api/endpoints/products.api.js)**:
   - Exposes `bulkImportProducts(data)` endpoint hitting `POST /products/bulk-import`.
   - Exposes `getImportHistory()` endpoint hitting `GET /products/import-history`.

