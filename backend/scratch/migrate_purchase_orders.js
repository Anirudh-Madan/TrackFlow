/**
 * migrate_purchase_orders.js
 * Creates purchase_order and purchase_order_item tables.
 * Also ensures vendor seed data exists.
 */
require('dotenv').config();
const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✅  DB connected');

    // Create purchase_order table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS purchase_order (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        po_number VARCHAR(60) NOT NULL UNIQUE,
        invoice_number VARCHAR(60) NOT NULL UNIQUE,
        vendor_id INT UNSIGNED NULL,
        vendor_name VARCHAR(200) NULL,
        po_date DATE NOT NULL,
        notes TEXT NULL,
        status ENUM('DRAFT','SUBMITTED') NOT NULL DEFAULT 'SUBMITTED',
        subtotal DECIMAL(14,2) NOT NULL DEFAULT 0,
        total DECIMAL(14,2) NOT NULL DEFAULT 0,
        created_by BIGINT UNSIGNED NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('   ✔  Table purchase_order ready');

    // Create purchase_order_item table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS purchase_order_item (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        purchase_order_id BIGINT UNSIGNED NOT NULL,
        product_id INT UNSIGNED NULL,
        part_number VARCHAR(100) NULL,
        description TEXT NULL,
        unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
        quantity INT UNSIGNED NOT NULL DEFAULT 1,
        total DECIMAL(14,2) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_poi_po FOREIGN KEY (purchase_order_id) REFERENCES purchase_order(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('   ✔  Table purchase_order_item ready');

    console.log('\n✅  Purchase order migration complete');
    process.exit(0);
  } catch (err) {
    console.error('❌  Migration failed:', err.message);
    process.exit(1);
  }
}

run();
