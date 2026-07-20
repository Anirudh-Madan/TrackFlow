/**
 * Migration 001 — TrackFlow Major Enhancements
 * Run: node migrations/001_enhancements.js
 *
 * Adds:
 *  - challan            : bill_number, notes, status, is_returned, return_reason, returned_at,
 *                         returned_by, supplier, party_name, grand_total, created_by, share_token
 *  - purchase_order     : bill_number, is_returned, return_reason, returned_at, returned_by,
 *                         share_token  (status ENUM extended)
 *  - app_setting        : new table
 *  - challan_edit_log   : new table
 *  - po_edit_log        : new table
 */

require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: console.log,
  }
);

async function addColumnIfNotExists(queryInterface, table, column, definition) {
  try {
    const tableDesc = await queryInterface.describeTable(table);
    if (!tableDesc[column]) {
      await queryInterface.addColumn(table, column, definition);
      console.log(`  ✓ Added ${table}.${column}`);
    } else {
      console.log(`  ~ ${table}.${column} already exists, skipping`);
    }
  } catch (err) {
    console.error(`  ✗ Error adding ${table}.${column}: ${err.message}`);
  }
}

async function run() {
  const qi = sequelize.getQueryInterface();

  console.log('\n─── Migrating: challan table ───────────────────────────────────');
  await addColumnIfNotExists(qi, 'challan', 'bill_number',   { type: DataTypes.STRING(60), allowNull: true });
  await addColumnIfNotExists(qi, 'challan', 'notes',         { type: DataTypes.TEXT, allowNull: true });
  await addColumnIfNotExists(qi, 'challan', 'status',        { type: DataTypes.ENUM('active','returned','cancelled'), defaultValue: 'active', allowNull: false });
  await addColumnIfNotExists(qi, 'challan', 'is_returned',   { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false });
  await addColumnIfNotExists(qi, 'challan', 'return_reason', { type: DataTypes.TEXT, allowNull: true });
  await addColumnIfNotExists(qi, 'challan', 'returned_at',   { type: DataTypes.DATE, allowNull: true });
  await addColumnIfNotExists(qi, 'challan', 'returned_by',   { type: DataTypes.BIGINT.UNSIGNED, allowNull: true });
  await addColumnIfNotExists(qi, 'challan', 'supplier',      { type: DataTypes.STRING(150), allowNull: true });
  await addColumnIfNotExists(qi, 'challan', 'party_name',    { type: DataTypes.STRING(200), allowNull: true });
  await addColumnIfNotExists(qi, 'challan', 'party_id',      { type: DataTypes.BIGINT.UNSIGNED, allowNull: true });
  await addColumnIfNotExists(qi, 'challan', 'grand_total',   { type: DataTypes.DECIMAL(14, 2), allowNull: true });
  await addColumnIfNotExists(qi, 'challan', 'created_by',    { type: DataTypes.BIGINT.UNSIGNED, allowNull: true });
  await addColumnIfNotExists(qi, 'challan', 'share_token',   { type: DataTypes.STRING(64), allowNull: true, unique: true });
  await addColumnIfNotExists(qi, 'challan', 'deleted_at',    { type: DataTypes.DATE, allowNull: true });

  console.log('\n─── Migrating: purchase_order table ────────────────────────────');
  await addColumnIfNotExists(qi, 'purchase_order', 'bill_number',   { type: DataTypes.STRING(60), allowNull: true });
  await addColumnIfNotExists(qi, 'purchase_order', 'is_returned',   { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false });
  await addColumnIfNotExists(qi, 'purchase_order', 'return_reason', { type: DataTypes.TEXT, allowNull: true });
  await addColumnIfNotExists(qi, 'purchase_order', 'returned_at',   { type: DataTypes.DATE, allowNull: true });
  await addColumnIfNotExists(qi, 'purchase_order', 'returned_by',   { type: DataTypes.BIGINT.UNSIGNED, allowNull: true });
  await addColumnIfNotExists(qi, 'purchase_order', 'share_token',   { type: DataTypes.STRING(64), allowNull: true, unique: true });

  // Extend purchase_order status ENUM
  try {
    await sequelize.query(`
      ALTER TABLE purchase_order
      MODIFY COLUMN status ENUM('DRAFT','SUBMITTED','RETURNED','CANCELLED')
      NOT NULL DEFAULT 'SUBMITTED'
    `);
    console.log('  ✓ Extended purchase_order.status ENUM');
  } catch (e) {
    console.log('  ~ purchase_order.status ENUM already extended or error:', e.message);
  }

  console.log('\n─── Creating: app_setting table ────────────────────────────────');
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS app_setting (
        id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`key\`     VARCHAR(100) NOT NULL UNIQUE,
        value       TEXT,
        updated_by  BIGINT UNSIGNED,
        updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('  ✓ app_setting table created');
  } catch (e) {
    console.log('  ~', e.message);
  }

  console.log('\n─── Creating: challan_edit_log table ───────────────────────────');
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS challan_edit_log (
        id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        challan_id     BIGINT UNSIGNED NOT NULL,
        edited_by      BIGINT UNSIGNED NOT NULL,
        edit_reason    TEXT NOT NULL,
        changed_fields JSON,
        created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_challan (challan_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('  ✓ challan_edit_log table created');
  } catch (e) {
    console.log('  ~', e.message);
  }

  console.log('\n─── Creating: po_edit_log table ────────────────────────────────');
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS po_edit_log (
        id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        po_id       BIGINT UNSIGNED NOT NULL,
        edited_by   BIGINT UNSIGNED NOT NULL,
        edit_reason TEXT NOT NULL,
        changed_fields JSON,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_po (po_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('  ✓ po_edit_log table created');
  } catch (e) {
    console.log('  ~', e.message);
  }

  console.log('\n─── Migration complete ─────────────────────────────────────────\n');
  await sequelize.close();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
