# DATABASE_STRUCTURE.md
## Enterprise ERP — Database Architecture
### MySQL 8.x + Sequelize ORM

---

## Conventions

- **PK:** `id` — BIGINT UNSIGNED AUTO_INCREMENT on every table
- **Timestamps:** `created_at`, `updated_at` DATETIME on every table
- **Soft delete:** `deleted_at` DATETIME NULL on all master-data tables (parties, products, users)
- **Naming:** snake_case tables, singular nouns
- **FKs:** always named `{referenced_table_singular}_id`
- **JSON columns:** used only for flexible payloads (audit before/after, custom fields, notification payload) — never as a substitute for proper columns on business-critical data
- **Decimal precision:** DECIMAL(12,2) for all monetary amounts; DECIMAL(10,4) for unit prices (supports sub-paisa pricing)

---

## Table Reference

### 1. `role`
Defines the four system roles.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | TINYINT UNSIGNED | PK | |
| name | ENUM('admin','sales_manager','inventory_manager','dispatch_worker') | NOT NULL, UNIQUE | |
| display_name | VARCHAR(50) | NOT NULL | Human-readable label |
| description | TEXT | NULL | |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

---

### 2. `permission`
All atomic permission codes in the system.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | SMALLINT UNSIGNED | PK | |
| code | VARCHAR(100) | NOT NULL, UNIQUE | e.g. `orders.create`, `stock.view_split` |
| module | VARCHAR(50) | NOT NULL | e.g. `orders`, `inventory` |
| action | ENUM('create','read','update','delete','approve','export','import') | NOT NULL | |
| description | VARCHAR(200) | NULL | |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

---

### 3. `role_permission`
Junction table implementing the permission matrix.

| Column | Type | Constraints |
|---|---|---|
| id | INT UNSIGNED | PK |
| role_id | TINYINT UNSIGNED | FK → role.id, NOT NULL |
| permission_id | SMALLINT UNSIGNED | FK → permission.id, NOT NULL |
| created_at | DATETIME | NOT NULL |

**Indexes:** UNIQUE(role_id, permission_id)

---

### 4. `user`
All system users across all roles.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | |
| login_id | VARCHAR(50) | NOT NULL, UNIQUE | e.g. `sm_ravi` |
| name | VARCHAR(100) | NOT NULL | Full display name |
| role_id | TINYINT UNSIGNED | FK → role.id, NOT NULL | |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt hash |
| phone | VARCHAR(20) | NULL | |
| is_active | TINYINT(1) | NOT NULL, DEFAULT 1 | |
| must_change_password | TINYINT(1) | NOT NULL, DEFAULT 1 | Forces change on first login |
| last_active_at | DATETIME | NULL | Updated on every API request |
| last_login_at | DATETIME | NULL | |
| created_by | BIGINT UNSIGNED | FK → user.id, NULL | Admin who created this user |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |
| deleted_at | DATETIME | NULL | Soft delete |

**Indexes:** INDEX(role_id), INDEX(is_active)

---

### 5. `login_attempt`
Tracks failed logins for lockout enforcement.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | |
| login_id | VARCHAR(50) | NOT NULL | |
| ip_address | VARCHAR(45) | NOT NULL | IPv4 or IPv6 |
| attempt_count | TINYINT UNSIGNED | NOT NULL, DEFAULT 1 | |
| last_attempt_at | DATETIME | NOT NULL | |
| locked_until | DATETIME | NULL | Set when attempt_count >= 5 |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

**Indexes:** INDEX(login_id), INDEX(ip_address)

---

### 6. `refresh_token`
Stored refresh tokens for JWT rotation.

| Column | Type | Constraints |
|---|---|---|
| id | BIGINT UNSIGNED | PK |
| user_id | BIGINT UNSIGNED | FK → user.id, NOT NULL |
| token_hash | VARCHAR(255) | NOT NULL, UNIQUE |
| expires_at | DATETIME | NOT NULL |
| revoked_at | DATETIME | NULL |
| ip_address | VARCHAR(45) | NULL |
| created_at | DATETIME | NOT NULL |

**Indexes:** INDEX(user_id), INDEX(token_hash)

---

### 7. `region`
Geographic sales regions.

| Column | Type | Constraints |
|---|---|---|
| id | INT UNSIGNED | PK |
| name | VARCHAR(100) | NOT NULL, UNIQUE |
| description | TEXT | NULL |
| created_by | BIGINT UNSIGNED | FK → user.id |
| created_at | DATETIME | NOT NULL |
| updated_at | DATETIME | NOT NULL |

---

### 8. `user_region`
Many-to-many: SMs can cover multiple regions.

| Column | Type | Constraints |
|---|---|---|
| id | INT UNSIGNED | PK |
| user_id | BIGINT UNSIGNED | FK → user.id, NOT NULL |
| region_id | INT UNSIGNED | FK → region.id, NOT NULL |
| assigned_at | DATETIME | NOT NULL |
| assigned_by | BIGINT UNSIGNED | FK → user.id |

**Indexes:** UNIQUE(user_id, region_id)

---

### 9. `party`
Customers / buyers. Every order originates from a party.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | |
| name | VARCHAR(200) | NOT NULL | |
| code | VARCHAR(50) | UNIQUE, NULL | Optional short code |
| contact_name | VARCHAR(100) | NULL | |
| phone | VARCHAR(20) | NULL | |
| email | VARCHAR(150) | NULL | |
| address | TEXT | NULL | |
| region_id | INT UNSIGNED | FK → region.id, NULL | |
| assigned_sm_id | BIGINT UNSIGNED | FK → user.id, NULL | Primary SM for this party |
| credit_limit | DECIMAL(12,2) | NOT NULL, DEFAULT 0 | |
| outstanding_balance | DECIMAL(12,2) | NOT NULL, DEFAULT 0 | Live running total |
| payment_terms_days | SMALLINT UNSIGNED | NULL | |
| is_active | TINYINT(1) | NOT NULL, DEFAULT 1 | |
| created_by | BIGINT UNSIGNED | FK → user.id | |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |
| deleted_at | DATETIME | NULL | Admin-only hard delete (soft) |

**Indexes:** INDEX(region_id), INDEX(assigned_sm_id), INDEX(is_active)

---

### 10. `party_rate_card`
Custom price per party per product.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | |
| party_id | BIGINT UNSIGNED | FK → party.id, NOT NULL | |
| product_id | BIGINT UNSIGNED | FK → product.id, NOT NULL | |
| custom_rate | DECIMAL(10,4) | NOT NULL | SM selling price default for this party |
| effective_from | DATE | NOT NULL | |
| created_by | BIGINT UNSIGNED | FK → user.id | |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

**Indexes:** UNIQUE(party_id, product_id), INDEX(product_id)

---

### 11. `product_category`
Hierarchical product categories.

| Column | Type | Constraints |
|---|---|---|
| id | INT UNSIGNED | PK |
| name | VARCHAR(100) | NOT NULL |
| parent_id | INT UNSIGNED | FK → product_category.id, NULL |
| created_at | DATETIME | NOT NULL |
| updated_at | DATETIME | NOT NULL |

---

### 12. `product`
The product catalogue.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | |
| part_number | VARCHAR(100) | NOT NULL, UNIQUE | Primary identifier |
| description | TEXT | NOT NULL | |
| category_id | INT UNSIGNED | FK → product_category.id, NULL | |
| unit | VARCHAR(20) | NOT NULL | e.g. pcs, box, set |
| hsn_code | VARCHAR(20) | NULL | |
| gst_percent | DECIMAL(5,2) | NOT NULL, DEFAULT 18 | |
| warehouse_location | VARCHAR(50) | NULL | e.g. AI-3, ZF, CANTEEN |
| low_stock_threshold | INT UNSIGNED | NOT NULL, DEFAULT 10 | |
| emission_mode | VARCHAR(50) | NULL | |
| engine_model | VARCHAR(100) | NULL | |
| application | TEXT | NULL | Vehicle types |
| old_part_number | VARCHAR(100) | NULL | |
| remarks | TEXT | NULL | |
| custom_fields | JSON | NULL | Admin-defined extra fields |
| base_price | DECIMAL(10,4) | NOT NULL, DEFAULT 0 | Current active base price |
| is_active | TINYINT(1) | NOT NULL, DEFAULT 1 | |
| created_by | BIGINT UNSIGNED | FK → user.id | |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |
| deleted_at | DATETIME | NULL | Admin-only |

**Indexes:** FULLTEXT(part_number, description), INDEX(category_id), INDEX(warehouse_location)

---

### 13. `price_history`
Immutable archive of all base price changes.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | |
| product_id | BIGINT UNSIGNED | FK → product.id, NOT NULL | |
| old_price | DECIMAL(10,4) | NOT NULL | |
| new_price | DECIMAL(10,4) | NOT NULL | |
| supplier_dn | DECIMAL(10,4) | NULL | Dealer net from upload |
| supplier_mrp | DECIMAL(10,4) | NULL | |
| supplier_rrp | DECIMAL(10,4) | NULL | |
| effective_from | DATE | NOT NULL | |
| effective_to | DATE | NULL | NULL = currently active |
| change_percent | DECIMAL(7,2) | NULL | Computed on save |
| uploaded_by | BIGINT UNSIGNED | FK → user.id | |
| upload_batch_id | BIGINT UNSIGNED | FK → import_history.id | |
| created_at | DATETIME | NOT NULL | |

**Indexes:** INDEX(product_id, effective_from), INDEX(upload_batch_id)

---

### 14. `stock`
One row per product. Tracks Stock1, Stock2, and combined state.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | |
| product_id | BIGINT UNSIGNED | FK → product.id, NOT NULL, UNIQUE | |
| stock1_qty | INT UNSIGNED | NOT NULL, DEFAULT 0 | Opening physical stock |
| stock2_qty | INT UNSIGNED | NOT NULL, DEFAULT 0 | Inward entries stock |
| combined_qty | INT UNSIGNED | GENERATED AS (stock1_qty + stock2_qty) STORED | |
| dual_tracking_active | TINYINT(1) | NOT NULL, DEFAULT 1 | False once stock1=0 permanently |
| last_updated_at | DATETIME | NOT NULL | |

**Indexes:** UNIQUE(product_id)

*Note:* `combined_qty` is a generated stored column — always consistent, zero-cost to query.

---

### 15. `stock_movement`
Immutable ledger of every stock change. The audit trail for inventory.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | |
| product_id | BIGINT UNSIGNED | FK → product.id, NOT NULL | |
| movement_type | ENUM('IMPORT_IN','INWARD_IN','DISPATCH_OUT','RETURN_IN','ADJUSTMENT','S1_TO_S2_TRANSFER') | NOT NULL | |
| stock_affected | ENUM('stock1','stock2','both') | NOT NULL | |
| quantity | INT | NOT NULL | Positive = in, Negative = out |
| stock1_before | INT UNSIGNED | NOT NULL | |
| stock1_after | INT UNSIGNED | NOT NULL | |
| stock2_before | INT UNSIGNED | NOT NULL | |
| stock2_after | INT UNSIGNED | NOT NULL | |
| reference_type | ENUM('inward_entry','order','dispatch','import','manual') | NOT NULL | |
| reference_id | BIGINT UNSIGNED | NULL | |
| performed_by | BIGINT UNSIGNED | FK → user.id | |
| notes | TEXT | NULL | |
| created_at | DATETIME | NOT NULL | |

**Indexes:** INDEX(product_id, created_at), INDEX(reference_type, reference_id)

---

### 16. `inward_entry`
Header record for a goods receipt from supplier.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | |
| entry_number | VARCHAR(50) | NOT NULL, UNIQUE | Auto-generated |
| supplier_name | VARCHAR(200) | NOT NULL | |
| bill_number | VARCHAR(100) | NOT NULL | |
| bill_date | DATE | NOT NULL | |
| received_by | BIGINT UNSIGNED | FK → user.id, NOT NULL | IM who saved |
| notes | TEXT | NULL | |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

**Indexes:** INDEX(supplier_name), INDEX(bill_date)

---

### 17. `inward_item`
Line items for an inward entry.

| Column | Type | Constraints |
|---|---|---|
| id | BIGINT UNSIGNED | PK |
| inward_entry_id | BIGINT UNSIGNED | FK → inward_entry.id, NOT NULL |
| product_id | BIGINT UNSIGNED | FK → product.id, NOT NULL |
| quantity_received | INT UNSIGNED | NOT NULL |
| created_at | DATETIME | NOT NULL |

**Indexes:** INDEX(inward_entry_id), INDEX(product_id)

---

### 18. `order`
Sales orders. Core transactional table.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | |
| order_number | VARCHAR(50) | NOT NULL, UNIQUE | Auto-generated |
| party_id | BIGINT UNSIGNED | FK → party.id, NOT NULL | |
| sales_manager_id | BIGINT UNSIGNED | FK → user.id, NOT NULL | |
| status | ENUM('PENDING','APPROVED','DISPATCHED','FLAGGED','RETURNED','CANCELLED') | NOT NULL, DEFAULT 'PENDING' | |
| order_date | DATE | NOT NULL | Server-set |
| subtotal | DECIMAL(12,2) | NOT NULL | Sum of line totals at SM price |
| gst_amount | DECIMAL(12,2) | NOT NULL | |
| grand_total | DECIMAL(12,2) | NOT NULL | |
| credit_hold | TINYINT(1) | NOT NULL, DEFAULT 0 | Set if party over limit at submission |
| flag_reason | TEXT | NULL | IM's reason if FLAGGED |
| cloned_from_id | BIGINT UNSIGNED | FK → order.id, NULL | Set if this is a cloned repeat order |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

**Indexes:** INDEX(party_id), INDEX(sales_manager_id, status), INDEX(status, created_at)

---

### 19. `order_item`
Line items for an order.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | |
| order_id | BIGINT UNSIGNED | FK → order.id, NOT NULL | |
| product_id | BIGINT UNSIGNED | FK → product.id, NOT NULL | |
| quantity | INT UNSIGNED | NOT NULL | |
| base_price | DECIMAL(10,4) | NOT NULL | Snapshot of base price at order time |
| sm_price | DECIMAL(10,4) | NOT NULL | SM's entered selling price |
| gst_percent | DECIMAL(5,2) | NOT NULL | Snapshot of GST% at order time |
| line_total | DECIMAL(12,2) | NOT NULL | quantity × sm_price |
| suggestion_added | TINYINT(1) | NOT NULL, DEFAULT 0 | TRUE if added from suggestion panel |
| created_at | DATETIME | NOT NULL | |

**Indexes:** INDEX(order_id), INDEX(product_id)

---

### 20. `order_status_history`
Immutable trail of every status change on an order.

| Column | Type | Constraints |
|---|---|---|
| id | BIGINT UNSIGNED | PK |
| order_id | BIGINT UNSIGNED | FK → order.id, NOT NULL |
| from_status | VARCHAR(20) | NULL |
| to_status | VARCHAR(20) | NOT NULL |
| changed_by | BIGINT UNSIGNED | FK → user.id |
| reason | TEXT | NULL |
| created_at | DATETIME | NOT NULL |

**Indexes:** INDEX(order_id, created_at)

---

### 21. `challan`
One challan per approved order. Auto-created on approval.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | |
| challan_number | VARCHAR(50) | NOT NULL, UNIQUE | Auto-generated on order approval |
| order_id | BIGINT UNSIGNED | FK → order.id, NOT NULL, UNIQUE | |
| generated_at | DATETIME | NOT NULL | Server timestamp |
| pdf_path | VARCHAR(500) | NULL | Path to generated PDF |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

**Indexes:** UNIQUE(order_id), INDEX(challan_number)

---

### 22. `dispatch`
Dispatch records — one per challan when picked by DW.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | |
| dispatch_number | VARCHAR(50) | NOT NULL, UNIQUE | |
| challan_id | BIGINT UNSIGNED | FK → challan.id, NOT NULL, UNIQUE | |
| dispatch_worker_id | BIGINT UNSIGNED | FK → user.id, NULL | Assigned DW |
| status | ENUM('QUEUED','PICKING','DISPATCHED') | NOT NULL, DEFAULT 'QUEUED' | |
| dispatched_at | DATETIME | NULL | Server-set on DISPATCHED |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

**Indexes:** UNIQUE(challan_id), INDEX(dispatch_worker_id, status)

---

### 23. `dispatch_item`
Per-item picking record within a dispatch.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | |
| dispatch_id | BIGINT UNSIGNED | FK → dispatch.id, NOT NULL | |
| order_item_id | BIGINT UNSIGNED | FK → order_item.id, NOT NULL | |
| product_id | BIGINT UNSIGNED | FK → product.id, NOT NULL | |
| quantity | INT UNSIGNED | NOT NULL | |
| is_picked | TINYINT(1) | NOT NULL, DEFAULT 0 | |
| picked_at | DATETIME | NULL | |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

**Indexes:** INDEX(dispatch_id), INDEX(product_id)

---

### 24. `payment`
Payment records against orders.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | |
| payment_number | VARCHAR(50) | NOT NULL, UNIQUE | |
| party_id | BIGINT UNSIGNED | FK → party.id, NOT NULL | |
| order_id | BIGINT UNSIGNED | FK → order.id, NULL | NULL = advance payment |
| amount | DECIMAL(12,2) | NOT NULL | |
| mode | ENUM('cash','cheque','upi','bank_transfer') | NOT NULL | |
| reference_no | VARCHAR(100) | NULL | Cheque/UTR number |
| payment_date | DATE | NOT NULL | |
| received_by | BIGINT UNSIGNED | FK → user.id, NOT NULL | SM who recorded |
| notes | TEXT | NULL | |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

**Indexes:** INDEX(party_id, payment_date), INDEX(order_id)

---

### 25. `reorder_flag`
Items flagged by SM as out-of-stock and needed.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | |
| product_id | BIGINT UNSIGNED | FK → product.id, NOT NULL | |
| flagged_by | BIGINT UNSIGNED | FK → user.id, NOT NULL | SM |
| party_id | BIGINT UNSIGNED | FK → party.id, NULL | Which party needed it |
| quantity_wanted | INT UNSIGNED | NOT NULL | |
| notes | TEXT | NULL | |
| status | ENUM('OPEN','ORDERED','RECEIVED') | NOT NULL, DEFAULT 'OPEN' | |
| ordered_at | DATETIME | NULL | When IM marked ORDERED |
| received_via_inward_id | BIGINT UNSIGNED | FK → inward_entry.id, NULL | Auto-set on inward |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

**Indexes:** INDEX(product_id, status), INDEX(flagged_by), INDEX(status)

---

### 26. `notification`
Notification records (persisted for offline delivery).

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | |
| type | VARCHAR(100) | NOT NULL | e.g. `order:submitted` |
| title | VARCHAR(200) | NOT NULL | |
| message | TEXT | NOT NULL | |
| severity | ENUM('info','warning','critical') | NOT NULL, DEFAULT 'info' | |
| payload | JSON | NULL | Entity reference data |
| created_at | DATETIME | NOT NULL | |

---

### 27. `notification_recipient`
Who each notification was sent to (role broadcast or specific user).

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | |
| notification_id | BIGINT UNSIGNED | FK → notification.id, NOT NULL | |
| user_id | BIGINT UNSIGNED | FK → user.id, NULL | Specific user |
| role_id | TINYINT UNSIGNED | FK → role.id, NULL | Role broadcast |
| is_read | TINYINT(1) | NOT NULL, DEFAULT 0 | |
| read_at | DATETIME | NULL | |
| created_at | DATETIME | NOT NULL | |

**Constraint:** CHECK (user_id IS NOT NULL OR role_id IS NOT NULL)
**Indexes:** INDEX(user_id, is_read), INDEX(notification_id)

---

### 28. `audit_log`
Immutable audit trail. No UPDATE or DELETE grants to application user.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | |
| actor_id | BIGINT UNSIGNED | NOT NULL | User who performed action |
| actor_name | VARCHAR(100) | NOT NULL | Snapshot at time of action |
| actor_role | VARCHAR(50) | NOT NULL | Snapshot |
| action_type | ENUM('create','update','delete','approve','flag','dispatch','login','logout','export','import','price_update','password_reset') | NOT NULL | |
| module | VARCHAR(50) | NOT NULL | |
| entity_type | VARCHAR(50) | NULL | e.g. `order`, `product` |
| entity_id | BIGINT UNSIGNED | NULL | |
| before_state | JSON | NULL | |
| after_state | JSON | NULL | |
| ip_address | VARCHAR(45) | NULL | |
| user_agent | VARCHAR(255) | NULL | |
| created_at | DATETIME | NOT NULL | |

**No FK on actor_id** — audit must survive user deletion. Store name/role as snapshots.
**Indexes:** INDEX(actor_id), INDEX(module, created_at), INDEX(entity_type, entity_id), INDEX(action_type, created_at)

---

### 29. `import_history`
Log of all Excel import operations.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | |
| import_type | ENUM('products','parties','opening_stock','price_list') | NOT NULL | |
| file_name | VARCHAR(255) | NOT NULL | |
| uploaded_by | BIGINT UNSIGNED | FK → user.id | |
| total_rows | INT UNSIGNED | NOT NULL | |
| success_rows | INT UNSIGNED | NOT NULL | |
| failed_rows | INT UNSIGNED | NOT NULL | |
| error_report | JSON | NULL | Array of {row, reason} for failures |
| status | ENUM('PROCESSING','COMPLETED','FAILED') | NOT NULL | |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

**Indexes:** INDEX(import_type, created_at), INDEX(uploaded_by)

---

### 30. `generated_document`
Track of all PDFs generated by the system.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | |
| doc_type | ENUM('challan','dispatch_summary','stock_report','audit_report','reorder_export') | NOT NULL | |
| reference_type | VARCHAR(50) | NULL | e.g. `challan`, `dispatch` |
| reference_id | BIGINT UNSIGNED | NULL | |
| file_path | VARCHAR(500) | NOT NULL | |
| file_size_kb | INT UNSIGNED | NULL | |
| generated_by | BIGINT UNSIGNED | FK → user.id | |
| created_at | DATETIME | NOT NULL | |

**Indexes:** INDEX(doc_type, reference_id)

---

## Relationship Summary

```
role ─────────────────────────── role_permission ── permission
  │
  └─ user ──────────────────────── user_region ── region
       │                                             │
       └─ party ──────────────────────────────────── ┘
             │
             ├─ party_rate_card ── product ── product_category
             │                         │
             │                         ├─ stock (1:1)
             │                         ├─ stock_movement (1:N)
             │                         └─ price_history (1:N)
             │
             ├─ order ──────────── order_item ── product
             │     │
             │     └─ order_status_history
             │     └─ challan ──── dispatch ── dispatch_item
             │                                        │
             │                                   (marks items as picked)
             │
             └─ payment (N orders, or advance)

reorder_flag ── product
             ── user (SM who flagged)
             ── party (context)
             ── inward_entry (auto-resolved on inward save)

inward_entry ── inward_item ── product

notification ── notification_recipient ── user | role

audit_log (standalone — no FK to user, stores snapshot)
import_history ── user
generated_document ── user
```

---

## MySQL Grant Policy

```sql
-- Application user: no UPDATE/DELETE on audit_log
GRANT SELECT, INSERT ON erp_db.audit_log TO 'erp_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON erp_db.* TO 'erp_app'@'%';
REVOKE UPDATE, DELETE ON erp_db.audit_log FROM 'erp_app'@'%';

-- Migrations user: full access
GRANT ALL PRIVILEGES ON erp_db.* TO 'erp_migrate'@'localhost';
```

---

## Key Indexes Summary

| Table | Index | Purpose |
|---|---|---|
| order | (sales_manager_id, status) | SM's own orders filtered by status |
| order | (party_id, created_at) | Party ledger view |
| order | (status, created_at) | IM approval queue |
| order_item | (order_id) | Load items for an order |
| order_item | (product_id) | Suggestion engine queries |
| dispatch | (dispatch_worker_id, status) | DW's queue |
| payment | (party_id, payment_date) | Ageing queries |
| stock_movement | (product_id, created_at) | Stock history |
| audit_log | (module, created_at) | Filtered audit queries |
| audit_log | (entity_type, entity_id) | Entity-specific audit trail |
| reorder_flag | (product_id, status) | Consolidated reorder list |
| notification_recipient | (user_id, is_read) | Unread count query |
| product | FULLTEXT(part_number, description) | Global search |