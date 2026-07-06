# FRONTEND_DEPENDENCIES.md
## Enterprise ERP — Frontend Package Reference
### React 18 + Vite + Tailwind

---

## Dependencies (Production)

| Package | Version | Purpose |
|---|---|---|
| `react` | ^18.3.0 | Core UI library. Concurrent features (Suspense, transitions) used for lazy-loaded module pages and deferred loading states. |
| `react-dom` | ^18.3.0 | DOM renderer for React. |
| `react-router-dom` | ^6.23.0 | Client-side routing. `createBrowserRouter` with nested layouts and lazy-loaded pages. Used for all role-scoped route trees. |
| `@tanstack/react-query` | ^5.40.0 | Server state management. All API data lives here — caching, background refetch, optimistic updates, pagination. Replaces useEffect+useState for all data fetching. |
| `zustand` | ^4.5.0 | Client state management. Auth state (user, token, permissions), UI state (sidebar, theme), notification unread count. Lightweight, no boilerplate. |
| `react-hook-form` | ^7.52.0 | Form state management. Handles all ERP forms (orders, parties, products, payments). Integrates with Zod for validation. |
| `@hookform/resolvers` | ^3.6.0 | Adapter to connect react-hook-form with Zod schema validation. |
| `zod` | ^3.23.0 | Schema validation for all form inputs. Shared schemas between client and server (type safety). |
| `axios` | ^1.7.0 | HTTP client. Single configured instance with JWT interceptors and auto-refresh on 401. |
| `socket.io-client` | ^4.7.0 | Real-time communication. Connects to server Socket.io for live notifications, order status updates, stock alerts. |
| `@tanstack/react-table` | ^8.17.0 | Headless table engine. Powers the central `DataTable` component with sorting, pagination, and row selection. |
| `react-hot-toast` | ^2.4.0 | Toast notification system. Used for action feedback (save success, errors, socket-triggered events). |
| `date-fns` | ^3.6.0 | Date formatting and arithmetic. Payment ageing calculations, date display, filter ranges. |
| `clsx` | ^2.1.0 | Conditional className composition. Used throughout components to build dynamic class strings cleanly. |
| `tailwind-merge` | ^2.3.0 | Merges conflicting Tailwind classes safely. Used in `cn()` utility alongside clsx. |
| `lucide-react` | ^0.395.0 | Icon library. All UI icons (sidebar, actions, status indicators). Clean, consistent, tree-shakable. |
| `@headlessui/react` | ^2.1.0 | Accessible unstyled UI primitives. Used for Modal, Dropdown, Transition, Combobox (search selects). |
| `react-dropzone` | ^14.2.0 | File drag-and-drop upload. Used in Excel import pages and price list upload. |

---

## Dev Dependencies

| Package | Purpose |
|---|---|
| `vite` | ^5.3.0 | Build tool and dev server. Fast HMR, code splitting per module, optimized production build. |
| `@vitejs/plugin-react` | ^4.3.0 | Vite plugin for React — enables JSX transform and Fast Refresh. |
| `tailwindcss` | ^3.4.0 | Utility-first CSS framework. All styling done via Tailwind classes. |
| `postcss` | ^8.4.0 | CSS processor. Required by Tailwind for class generation pipeline. |
| `autoprefixer` | ^10.4.0 | PostCSS plugin. Adds vendor prefixes automatically for browser compatibility. |
| `eslint` | ^9.5.0 | JavaScript linter. Enforces code style and catches common errors. |
| `eslint-plugin-react` | ^7.34.0 | React-specific ESLint rules (hooks, JSX). |
| `eslint-plugin-react-hooks` | ^4.6.0 | Enforces Rules of Hooks (no conditional hook calls). |
| `prettier` | ^3.3.0 | Code formatter. Consistent formatting across all JS/JSX/CSS files. |
| `prettier-plugin-tailwindcss` | ^0.6.0 | Sorts Tailwind classes in a consistent canonical order. |

---

## Notable Decisions

**No Redux.** Zustand handles auth and UI state with a fraction of the boilerplate. TanStack Query handles all server state.

**No component library (MUI, Ant Design, Chakra).** All components are built from Headless UI primitives styled with Tailwind. This gives full design control and avoids bundle bloat from large component libraries.

**`@tanstack/react-table` over other table libs.** It's headless — we control 100% of the markup and styling. Critical for an ERP where tables are the primary interface.

**`date-fns` over `moment` or `dayjs`.** Tree-shakable, immutable, and actively maintained.

**`lucide-react` over `react-icons`.** Consistent design language, much smaller bundle per icon due to individual imports.