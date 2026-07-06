# BACKEND_DEPENDENCIES.md
## Enterprise ERP — Backend Package Reference
### Node.js + Express + Sequelize + MySQL

---

## Dependencies (Production)

| Package | Version | Purpose |
|---|---|---|
| `express` | ^4.19.0 | HTTP web framework. Route definitions, middleware chain, request/response handling. |
| `sequelize` | ^6.37.0 | ORM for MySQL. Model definitions, migrations, associations, query builder. |
| `mysql2` | ^3.10.0 | MySQL driver. Used by Sequelize under the hood. Supports connection pooling and prepared statements. |
| `jsonwebtoken` | ^9.0.0 | JWT access token signing and verification. Used in auth middleware. |
| `bcrypt` | ^5.1.0 | Password hashing. All passwords hashed with bcrypt before storage (cost factor 12). |
| `socket.io` | ^4.7.0 | WebSocket server. Real-time event delivery to role/user rooms. Notifications, order updates, stock alerts. |
| `multer` | ^1.4.5 | Multipart form data handling. File upload middleware for Excel imports and price list uploads. |
| `exceljs` | ^4.4.0 | Excel file reading and writing. Powers import parsing, export generation, and price list processing. |
| `pdfkit` | ^0.15.0 | PDF generation. Challan PDFs, dispatch summary, stock reports, audit exports. |
| `node-cron` | ^3.0.0 | Cron job scheduler. Runs stock alert checks, credit sweeps, session cleanup on schedule. |
| `express-validator` | ^7.1.0 | Request validation. Validates body, params, query on every incoming request. Returns structured 422 errors. |
| `helmet` | ^7.1.0 | Security headers middleware. Sets Content-Security-Policy, X-Frame-Options, and other protective headers. |
| `cors` | ^2.8.5 | CORS middleware. Allows requests from configured frontend origin only. |
| `express-rate-limit` | ^7.3.0 | Rate limiting. Prevents brute-force attacks on login and API endpoints. |
| `dotenv` | ^16.4.0 | Environment variable loading from `.env` file into `process.env`. |
| `uuid` | ^10.0.0 | UUID generation for unique document numbers (challan, dispatch, payment). |
| `winston` | ^3.13.0 | Application logging. Structured JSON logs with log levels. Transport to console in dev, file in prod. |
| `morgan` | ^1.10.0 | HTTP request logging middleware. Logs method, URL, status, response time. Feeds into Winston. |

---

## Dev Dependencies

| Package | Purpose |
|---|---|
| `nodemon` | ^3.1.0 | Auto-restarts Node server on file changes during development. |
| `sequelize-cli` | ^6.6.0 | CLI for running migrations and seeders (`db:migrate`, `db:seed`). |
| `jest` | ^29.7.0 | Test runner for unit and integration tests. |
| `supertest` | ^7.0.0 | HTTP assertion library for testing Express routes. Works with Jest. |
| `eslint` | ^9.5.0 | JavaScript linter. Enforces backend code style. |
| `prettier` | ^3.3.0 | Code formatter. |
| `cross-env` | ^7.0.0 | Cross-platform environment variable setting. Used in npm scripts (`cross-env NODE_ENV=test`). |

---

## Notable Decisions

**`mysql2` over `mysql`.** The `mysql2` package is faster, supports Promises natively, and is what Sequelize recommends for MySQL.

**`exceljs` over `xlsx` (SheetJS).** ExcelJS has a clean, Promise-based API for both reading and writing. It handles large files via streaming and produces well-formatted output with full styling control.

**`pdfkit` over `puppeteer`.** For server-side PDF generation without a browser, PDFKit is lightweight and has no external process dependencies. Puppeteer would require a headless Chrome instance — unnecessary overhead for structured document generation.

**`node-cron` over `agenda` or `bull`.** For the current scale (single server, 4 cron jobs), `node-cron` is sufficient and has zero external dependencies (no Redis required). If the system grows to need job queues with retry logic, BullMQ + Redis is the natural upgrade path.

**`express-validator` over `joi` or `yup`.** Integrates directly as Express middleware, and is well-maintained. Validation schemas live in the same module folder as the routes they protect.

**`winston` over `console.log`.** Structured JSON logs are parseable by log aggregation tools (Datadog, CloudWatch, Grafana Loki) when the system is deployed. Winston supports multiple transports and log rotation.

**`bcrypt` cost factor 12.** Balances security (computationally expensive to brute-force) with performance (~100ms per hash on modern hardware — acceptable for login, not for hot paths).

**No ORM-level soft delete plugin.** Soft deletes are implemented as explicit `deleted_at` columns with `WHERE deleted_at IS NULL` conditions in repository queries. This keeps behavior transparent and avoids magic from plugins like `sequelize-paranoid`.

---

## Environment Configuration

All sensitive configuration is environment-variable driven. The application will refuse to start if required variables are missing (validated on startup in `config/` files).

Required production variables:
```
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
STORAGE_PATH
CORS_ORIGIN
PORT
```

No secrets are ever committed to the repository. The `.env.example` file documents all required and optional variables with descriptions but no values.