/**
 * migrate_order_items.js
 * Adds part_number, description, and dl_price columns to the order_item table.
 * Safe to run multiple times (uses IF NOT EXISTS via SHOW COLUMNS check).
 */
require('dotenv').config()
const sequelize = require('../config/database')

async function run() {
  try {
    await sequelize.authenticate()
    console.log('✅  DB connection established')

    const qi = sequelize.getQueryInterface()

    // Check existing columns
    const tableDesc = await sequelize.query('SHOW COLUMNS FROM order_item', {
      type: sequelize.QueryTypes.SELECT,
    })
    const existingCols = tableDesc.map(c => c.Field)

    if (!existingCols.includes('part_number')) {
      await sequelize.query("ALTER TABLE order_item ADD COLUMN part_number VARCHAR(100) NULL AFTER product_id")
      console.log('   ✔  Added column: part_number')
    } else {
      console.log('   ⚠  Column part_number already exists — skipping')
    }

    if (!existingCols.includes('description')) {
      await sequelize.query("ALTER TABLE order_item ADD COLUMN description TEXT NULL AFTER part_number")
      console.log('   ✔  Added column: description')
    } else {
      console.log('   ⚠  Column description already exists — skipping')
    }

    if (!existingCols.includes('dl_price')) {
      await sequelize.query("ALTER TABLE order_item ADD COLUMN dl_price DECIMAL(12,2) NULL AFTER description")
      console.log('   ✔  Added column: dl_price')
    } else {
      console.log('   ⚠  Column dl_price already exists — skipping')
    }

    console.log('\n✅  Migration complete')
    process.exit(0)
  } catch (err) {
    console.error('❌  Migration failed:', err.message)
    process.exit(1)
  }
}

run()
