# FRONTEND_STRUCTURE.md
## Enterprise ERP — Frontend Architecture
### React 18 + Vite + Tailwind + React Router DOM + TanStack Query + Zustand

---

## Complete Folder Tree

```
src/
├── main.jsx                        # App entry point, providers setup
├── App.jsx                         # Root router, auth guard wrapper
│
├── assets/                         # Static assets
│   ├── logo.svg
│   └── fonts/                      # Self-hosted Inter font files
│
├── theme/                          # Design system
│   ├── tokens.js                   # Color, spacing, typography tokens
│   ├── tailwind.config.js          # Tailwind customization (extends tokens)
│   └── darkMode.js                 # Dark/light mode toggle logic
│
├── router/                         # Routing layer
│   ├── index.jsx                   # Root router definition
│   ├── guards/
│   │   ├── AuthGuard.jsx           # Redirects unauthenticated users to /login
│   │   ├── RoleGuard.jsx           # Redirects users accessing wrong role routes
│   │   └── FirstLoginGuard.jsx     # Forces password change on first login
│   └── routes/
│       ├── adminRoutes.jsx         # All /admin/* route definitions
│       ├── smRoutes.jsx            # All /sm/* route definitions
│       ├── imRoutes.jsx            # All /im/* route definitions
│       └── dwRoutes.jsx            # All /dw/* route definitions
│
├── layouts/                        # Shell layouts per role
│   ├── AdminLayout.jsx             # Admin shell: topnav + sidebar + content
│   ├── SMLayout.jsx                # SM shell: topnav + sidebar + content
│   ├── IMLayout.jsx                # IM shell: topnav + sidebar + content
│   ├── DWLayout.jsx                # DW shell: topnav + sidebar + content
│   └── AuthLayout.jsx              # Login/password pages (no sidebar)
│
├── components/                     # Shared, role-agnostic UI components
│   ├── ui/                         # Primitive UI elements
│   │   ├── Button.jsx              # Primary, secondary, ghost, danger variants
│   │   ├── Input.jsx               # Text input with label, error, helper
│   │   ├── Select.jsx              # Dropdown select with search
│   │   ├── Textarea.jsx
│   │   ├── Checkbox.jsx
│   │   ├── Badge.jsx               # Status badges (green/amber/red/gray)
│   │   ├── Spinner.jsx             # Loading spinner
│   │   ├── Skeleton.jsx            # Loading skeleton for tables/cards
│   │   ├── Modal.jsx               # Accessible modal dialog
│   │   ├── Drawer.jsx              # Right-side slide-over panel
│   │   ├── Tooltip.jsx
│   │   ├── Tabs.jsx
│   │   ├── Alert.jsx               # Info/warning/error/success banners
│   │   ├── Card.jsx                # Content card container
│   │   ├── Divider.jsx
│   │   └── EmptyState.jsx          # Empty table/list state with CTA
│   │
│   ├── layout/                     # Layout sub-components
│   │   ├── TopNavbar.jsx           # Top bar: breadcrumbs, search, bell, avatar
│   │   ├── Sidebar.jsx             # Collapsible sidebar shell
│   │   ├── SidebarItem.jsx         # Single nav item with icon, label, badge
│   │   ├── SidebarGroup.jsx        # Grouped nav section with header
│   │   ├── Breadcrumb.jsx          # Auto-generated from route
│   │   ├── NotificationBell.jsx    # Bell icon with unread count
│   │   ├── ProfileMenu.jsx         # Avatar dropdown: profile, theme, logout
│   │   └── GlobalSearch.jsx        # Command-palette-style global search
│   │
│   ├── data/                       # Data display components
│   │   ├── DataTable.jsx           # Sortable, paginated, filterable table
│   │   ├── TablePagination.jsx     # Pagination controls
│   │   ├── TableFilters.jsx        # Filter bar (status, date, search)
│   │   ├── StatCard.jsx            # Dashboard metric card
│   │   ├── StatusBadge.jsx         # Order/dispatch/stock status chips
│   │   ├── StockBadge.jsx          # In Stock / Low Stock / Out of Stock
│   │   └── PaymentAgeingBadge.jsx  # Green/amber/red payment ageing
│   │
│   ├── form/                       # Form components (React Hook Form wrappers)
│   │   ├── FormField.jsx           # Label + input + error message wrapper
│   │   ├── FormSelect.jsx          # RHF-connected select
│   │   ├── FormTextarea.jsx        # RHF-connected textarea
│   │   ├── FormDatePicker.jsx      # Date picker
│   │   ├── FormSearchSelect.jsx    # Async search select (for products/parties)
│   │   └── FormFileUpload.jsx      # Drag-drop file upload with preview
│   │
│   └── feedback/                   # User feedback components
│       ├── Toast.jsx               # Toast notification (success/error/info)
│       ├── ConfirmDialog.jsx       # "Are you sure?" confirmation modal
│       └── ErrorBoundary.jsx       # React error boundary with fallback UI
│
├── modules/                        # Feature modules (one per ERP module)
│   │
│   ├── auth/
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx       # Login form
│   │   │   └── ChangePasswordPage.jsx  # Forced first-login password change
│   │   ├── hooks/
│   │   │   └── useLogin.js         # Login mutation + redirect logic
│   │   └── components/
│   │       └── LoginForm.jsx
│   │
│   ├── dashboard/
│   │   ├── admin/
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── widgets/
│   │   │   │   ├── OrderSummaryWidget.jsx
│   │   │   │   ├── CreditAlertWidget.jsx
│   │   │   │   ├── LowStockWidget.jsx
│   │   │   │   ├── Stock1CleanupWidget.jsx
│   │   │   │   ├── ReorderSummaryWidget.jsx
│   │   │   │   ├── SuggestionConversionWidget.jsx
│   │   │   │   └── RecentAuditWidget.jsx
│   │   ├── sm/
│   │   │   ├── SMDashboard.jsx
│   │   │   └── widgets/
│   │   │       ├── MyOrdersWidget.jsx
│   │   │       ├── OverduePartiesWidget.jsx
│   │   │       ├── MyReorderFlagsWidget.jsx
│   │   │       └── PricingSummaryWidget.jsx
│   │   ├── im/
│   │   │   ├── IMDashboard.jsx
│   │   │   └── widgets/
│   │   │       ├── PendingOrdersWidget.jsx
│   │   │       ├── LowStockWidget.jsx
│   │   │       ├── ReorderWidget.jsx
│   │   │       └── InwardTodayWidget.jsx
│   │   └── dw/
│   │       ├── DWDashboard.jsx
│   │       └── widgets/
│   │           ├── AssignedChallansWidget.jsx
│   │           └── DispatchedTodayWidget.jsx
│   │
│   ├── users/
│   │   ├── pages/
│   │   │   ├── UsersListPage.jsx
│   │   │   ├── UserCreatePage.jsx
│   │   │   └── UserEditPage.jsx
│   │   ├── hooks/
│   │   │   ├── useUsers.js         # TanStack Query: list + fetch
│   │   │   └── useUserMutations.js # create, update, deactivate
│   │   └── components/
│   │       ├── UserTable.jsx
│   │       └── UserForm.jsx
│   │
│   ├── regions/
│   │   ├── pages/
│   │   │   └── RegionsPage.jsx
│   │   ├── hooks/
│   │   │   └── useRegions.js
│   │   └── components/
│   │       ├── RegionTable.jsx
│   │       └── RegionForm.jsx
│   │
│   ├── parties/
│   │   ├── pages/
│   │   │   ├── PartiesListPage.jsx
│   │   │   ├── PartyDetailPage.jsx  # Ledger, order history, credit info
│   │   │   └── PartyImportPage.jsx  # Excel import flow
│   │   ├── hooks/
│   │   │   ├── useParties.js
│   │   │   └── usePartyMutations.js
│   │   └── components/
│   │       ├── PartyTable.jsx
│   │       ├── PartyForm.jsx
│   │       ├── PartyLedger.jsx       # Orders + payments timeline
│   │       ├── CreditLimitBanner.jsx # Inline credit warning during order
│   │       └── PartyOrderHistory.jsx # Last 10 orders for SM field use
│   │
│   ├── products/
│   │   ├── pages/
│   │   │   ├── ProductsListPage.jsx
│   │   │   ├── ProductDetailPage.jsx
│   │   │   └── ProductImportPage.jsx
│   │   ├── hooks/
│   │   │   ├── useProducts.js
│   │   │   └── useProductMutations.js
│   │   └── components/
│   │       ├── ProductTable.jsx
│   │       ├── ProductForm.jsx        # Includes all custom Admin fields
│   │       └── ProductSearchSelect.jsx # Async search used in order screen
│   │
│   ├── inventory/
│   │   ├── pages/
│   │   │   ├── StockOverviewPage.jsx
│   │   │   └── StockCleanupPage.jsx  # Admin: Stock1/Stock2 cleanup tool
│   │   ├── hooks/
│   │   │   └── useStock.js
│   │   └── components/
│   │       ├── StockTable.jsx         # Shows combined or split depending on role
│   │       └── StockSplitBadge.jsx    # Stock1 | Stock2 display for IM/Admin
│   │
│   ├── inward/
│   │   ├── pages/
│   │   │   ├── InwardListPage.jsx
│   │   │   ├── InwardNewPage.jsx
│   │   │   └── InwardDetailPage.jsx
│   │   ├── hooks/
│   │   │   ├── useInwardEntries.js
│   │   │   └── useInwardMutations.js
│   │   └── components/
│   │       ├── InwardEntryForm.jsx    # Header + dynamic line items
│   │       ├── InwardLineItem.jsx     # Part search + qty + inline create
│   │       └── InwardHistoryTable.jsx
│   │
│   ├── orders/
│   │   ├── pages/
│   │   │   ├── OrdersListPage.jsx    # All orders (Admin/IM) or own (SM)
│   │   │   ├── OrderNewPage.jsx      # SM: full order builder
│   │   │   ├── OrderDetailPage.jsx   # View + actions (approve/flag/dispatch)
│   │   │   └── OrderHistoryPage.jsx  # SM: own past orders, clone action
│   │   ├── hooks/
│   │   │   ├── useOrders.js
│   │   │   └── useOrderMutations.js
│   │   └── components/
│   │       ├── OrderTable.jsx
│   │       ├── OrderBuilder/
│   │       │   ├── OrderBuilder.jsx       # Parent: party select + items + submit
│   │       │   ├── PartySelector.jsx      # Searchable party dropdown
│   │       │   ├── SmartSuggestionPanel.jsx  # Suggestion cards with + Add
│   │       │   ├── OrderItemRow.jsx        # Product search + base price + SM price
│   │       │   ├── OrderItemList.jsx       # Dynamic list of rows
│   │       │   └── OrderSummary.jsx        # Totals, GST, submit button
│   │       ├── OrderStatusTrail.jsx   # Visual status timeline
│   │       ├── OrderFlagModal.jsx     # IM: flag with reason
│   │       └── OrderReturnModal.jsx   # Admin/IM: return/cancel with reason
│   │
│   ├── challans/
│   │   ├── pages/
│   │   │   ├── ChallansListPage.jsx
│   │   │   └── ChallanDetailPage.jsx  # Full challan view + PDF download
│   │   ├── hooks/
│   │   │   └── useChallans.js
│   │   └── components/
│   │       ├── ChallanTable.jsx
│   │       └── ChallanPdfButton.jsx   # Triggers PDF download API
│   │
│   ├── dispatch/
│   │   ├── pages/
│   │   │   ├── DispatchQueuePage.jsx  # DW: list of assigned challans
│   │   │   ├── DispatchPickPage.jsx   # DW: item-by-item picking interface
│   │   │   └── DispatchSummaryPage.jsx # Daily summary PDF download
│   │   ├── hooks/
│   │   │   ├── useDispatches.js
│   │   │   └── useDispatchMutations.js
│   │   └── components/
│   │       ├── ChallanPickList.jsx    # Rack location + pick checkbox per item
│   │       └── DispatchTable.jsx
│   │
│   ├── payments/
│   │   ├── pages/
│   │   │   ├── PaymentsListPage.jsx
│   │   │   ├── PaymentNewPage.jsx
│   │   │   └── PartyLedgerPage.jsx
│   │   ├── hooks/
│   │   │   ├── usePayments.js
│   │   │   └── usePaymentMutations.js
│   │   └── components/
│   │       ├── PaymentForm.jsx
│   │       ├── PaymentTable.jsx
│   │       └── AgeingBadge.jsx       # Green/amber/red ageing indicator
│   │
│   ├── prices/
│   │   ├── pages/
│   │   │   ├── PriceUpdatePage.jsx    # Upload → preview → confirm flow
│   │   │   └── PriceHistoryPage.jsx
│   │   ├── hooks/
│   │   │   └── usePrices.js
│   │   └── components/
│   │       ├── PriceUploadForm.jsx
│   │       ├── PricePreviewTable.jsx  # Old / New / Change% with row deselect
│   │       └── PriceHistoryTable.jsx
│   │
│   ├── reorder/
│   │   ├── pages/
│   │   │   ├── ReorderListPage.jsx    # IM/Admin: consolidated list
│   │   │   └── MyReorderFlagsPage.jsx # SM: own flags
│   │   ├── hooks/
│   │   │   ├── useReorderList.js
│   │   │   └── useReorderMutations.js
│   │   └── components/
│   │       ├── ReorderTable.jsx
│   │       ├── ReorderFlagModal.jsx   # SM: flag item modal (qty + note)
│   │       └── ReorderStatusBadge.jsx # Open / Ordered / Received
│   │
│   ├── notifications/
│   │   ├── pages/
│   │   │   └── NotificationsPage.jsx  # Full notification history
│   │   ├── hooks/
│   │   │   └── useNotifications.js
│   │   └── components/
│   │       ├── NotificationList.jsx
│   │       └── NotificationItem.jsx
│   │
│   ├── audit/
│   │   ├── pages/
│   │   │   └── AuditLogPage.jsx       # Admin only
│   │   ├── hooks/
│   │   │   └── useAuditLogs.js
│   │   └── components/
│   │       └── AuditLogTable.jsx
│   │
│   └── reports/
│       ├── pages/
│       │   ├── SalesReportPage.jsx
│       │   ├── StockReportPage.jsx
│       │   ├── ImportHistoryPage.jsx
│       │   └── SuggestionConversionPage.jsx
│       └── hooks/
│           └── useReports.js
│
├── api/                            # Axios API layer
│   ├── client.js                   # Axios instance: base URL, interceptors
│   ├── interceptors/
│   │   ├── authInterceptor.js      # Attach JWT to every request
│   │   └── refreshInterceptor.js   # Auto-refresh token on 401
│   └── endpoints/
│       ├── auth.api.js
│       ├── users.api.js
│       ├── regions.api.js
│       ├── parties.api.js
│       ├── products.api.js
│       ├── inventory.api.js
│       ├── inward.api.js
│       ├── orders.api.js
│       ├── challans.api.js
│       ├── dispatch.api.js
│       ├── payments.api.js
│       ├── prices.api.js
│       ├── reorder.api.js
│       ├── notifications.api.js
│       ├── audit.api.js
│       └── reports.api.js
│
├── socket/                         # Socket.io client layer
│   ├── socketClient.js             # Socket.io instance, connect/disconnect
│   ├── socketEvents.js             # Constants: event name strings
│   └── useSocket.js                # React hook: subscribe to events, cleanup
│
├── store/                          # Zustand stores
│   ├── authStore.js                # user, permissions, tokens, isAuthenticated
│   ├── uiStore.js                  # sidebarCollapsed, theme, globalLoading
│   └── notificationStore.js        # unreadCount, latestNotification
│
├── hooks/                          # Shared custom hooks
│   ├── usePermission.js            # Check if current user has a permission code
│   ├── useDebounce.js              # Debounce hook for search inputs
│   ├── usePagination.js            # Shared pagination state + params builder
│   ├── useTableFilters.js          # Filter state management for DataTable
│   ├── useToast.js                 # Trigger toast notifications
│   └── useConfirm.js              # Trigger confirm dialog, returns Promise
│
├── utils/                          # Pure utility functions
│   ├── formatters.js               # Currency, date, number formatters
│   ├── validators.js               # Client-side validation helpers
│   ├── permissions.js              # Permission map parser + lookup helpers
│   ├── stockUtils.js               # Stock state color/label helpers
│   ├── orderUtils.js               # Order status label/color helpers
│   └── fileUtils.js                # File size, type validation for uploads
│
└── constants/                      # App-wide constants
    ├── roles.js                    # Role string constants
    ├── orderStatuses.js            # Order status constants + labels
    ├── dispatchStatuses.js
    ├── paymentModes.js
    ├── stockStates.js
    ├── reorderStatuses.js
    └── socketEvents.js             # Mirrors socket/socketEvents.js (shared)
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