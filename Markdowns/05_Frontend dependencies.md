# FRONTEND_DEPENDENCIES.md
## Enterprise ERP — Frontend Package Reference
### React 19 + Vite 8 + Tailwind 3

---

## Dependencies (Production)

| Package | Version | Purpose |
|---|---|---|
| `react` | ^19.2.6 | Core UI library. Concurrent features (Suspense, transitions) used for lazy-loaded module pages and deferred loading states. |
| `react-dom` | ^19.2.6 | DOM renderer for React. |
| `react-router-dom` | ^7.18.0 | Client-side routing. Nested layouts and role-scoped route trees. |
| `@tanstack/react-query` | ^5.101.0 | Server state management. All API data lives here — caching, background refetch, optimistic updates, pagination. |
| `zustand` | ^5.0.14 | Client state management. Auth state (user, token), UI state (sidebar, theme), notification unread count. |
| `react-hook-form` | ^7.80.0 | Form state management. Handles all ERP forms (orders, parties, products, payments). Integrates with Zod for validation. |
| `@hookform/resolvers` | ^5.4.0 | Adapter to connect react-hook-form with Zod schema validation. |
| `zod` | ^4.4.3 | Schema validation for all form inputs. |
| `axios` | ^1.18.0 | HTTP client. Single configured instance with JWT interceptors and auto-refresh on 401. |
| `socket.io-client` | ^4.8.3 | Real-time communication. Connects to server Socket.io for live notifications, order status updates, stock alerts. |
| `@tanstack/react-table` | ^8.21.3 | Headless table engine. Powers the central `DataTable` component with sorting, pagination, and row selection. |
| `react-hot-toast` | ^2.6.0 | Toast notification system. Used for action feedback (save success, errors, socket-triggered events). |
| `date-fns` | ^4.4.0 | Date formatting and arithmetic. Payment ageing calculations, date display, filter ranges. |
| `clsx` | ^2.1.1 | Conditional className composition. Used throughout components to build dynamic class strings cleanly. |
| `tailwind-merge` | ^3.6.0 | Merges conflicting Tailwind classes safely. Used in `cn()` utility alongside clsx. |
| `lucide-react` | ^1.21.0 | Icon library. All UI icons (sidebar, actions, status indicators). Clean, consistent, tree-shakable. |
| `@headlessui/react` | ^2.2.10 | Accessible unstyled UI primitives. Used for Modal, Dropdown, Transition, Combobox (search selects). |
| `react-dropzone` | ^15.0.0 | File drag-and-drop upload. Used in Excel import pages and price list upload. |

---

## Dev Dependencies

| Package | Version | Purpose |
|---|---|---|
| `vite` | ^8.0.12 | Build tool and dev server. Fast HMR, code splitting per module, optimized production build. |
| `@vitejs/plugin-react` | ^6.0.1 | Vite plugin for React — enables JSX transform and Fast Refresh. |
| `tailwindcss` | ^3.4.17 | Utility-first CSS framework. All styling done via Tailwind classes. |
| `postcss` | ^8.5.15 | CSS processor. Required by Tailwind for class generation pipeline. |
| `autoprefixer` | ^10.5.0 | PostCSS plugin. Adds vendor prefixes automatically for browser compatibility. |
| `eslint` | ^9.7.0 | JavaScript linter. Enforces code style and catches common errors. |
| `eslint-plugin-react` | ^7.37.5 | React-specific ESLint rules (hooks, JSX). |
| `eslint-plugin-react-hooks` | ^7.1.1 | Enforces Rules of Hooks (no conditional hook calls). |
| `prettier` | ^3.8.4 | Code formatter. Consistent formatting across all JS/JSX/CSS files. |
| `prettier-plugin-tailwindcss` | ^0.8.0 | Sorts Tailwind classes in a consistent canonical order. |



---

## Notable Decisions

**No Redux.** Zustand handles auth and UI state with a fraction of the boilerplate. TanStack Query handles all server state.

**No component library (MUI, Ant Design, Chakra).** All components are built from Headless UI primitives styled with Tailwind. This gives full design control and avoids bundle bloat from large component libraries.

**`@tanstack/react-table` over other table libs.** It's headless — we control 100% of the markup and styling. Critical for an ERP where tables are the primary interface.

**`date-fns` over `moment` or `dayjs`.** Tree-shakable, immutable, and actively maintained.

**`lucide-react` over `react-icons`.** Consistent design language, much smaller bundle per icon due to individual imports.