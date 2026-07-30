const { PurchaseOrder, PurchaseOrderItem, sequelize } = require('../models');

async function testPOCreate() {
  const t = await sequelize.transaction();
  try {
    const po = await PurchaseOrder.create({
      po_number: `#TEST-${Math.floor(1000 + Math.random() * 9000)}`,
      invoice_number: `INV-TEST-${Date.now()}`,
      share_token: `test-token-${Date.now()}`,
      vendor_name: 'CCC',
      po_date: new Date(),
      bill_number: null,
      status: 'SUBMITTED',
      subtotal: 100.00,
      total: 100.00,
      created_by: 1,
    }, { transaction: t });

    console.log('PO created successfully:', po.id, po.po_number);
    await t.rollback(); // rollback so we don't pollute DB
    console.log('Transaction rolled back successfully. No 500 error!');
    process.exit(0);
  } catch (err) {
    console.error('Error creating PO:', err);
    await t.rollback();
    process.exit(1);
  }
}

testPOCreate();
