const controller = require('./modules/products/products.controller');
const { sequelize } = require('./models');

async function run() {
  const req = {
    body: {
      items: [
        { sku: 'SK-004', purchase_price: 110, selling_price: 160, dealer_landing_price: 130, quantity: 75 },
        { sku: 'SKU-001', name: 'Seeded Product 1', purchase_price: 100.5, selling_price: 150, dealer_landing_price: 120, quantity: 50 },
        { sku: 'SKU-NEW', name: 'Brand New Product', purchase_price: 250, selling_price: 400, dealer_landing_price: 300, quantity: 10 }
      ],
      stock_mode: 'absolute',
      effective_from: '2026-06-29',
      notes: 'test'
    },
    user: { id: 1, name: 'System Admin', role: 'admin' },
    ip: '127.0.0.1',
    headers: { 'user-agent': 'test-agent' }
  };

  const res = {
    status: (code) => {
      console.log('Status:', code);
      return {
        json: (data) => console.log('JSON:', JSON.stringify(data, null, 2))
      };
    },
    json: (data) => console.log('JSON:', JSON.stringify(data, null, 2))
  };

  const next = (err) => {
    console.error('Next called with error:', err);
  };

  try {
    await controller.bulkImport(req, res, next);
  } catch (err) {
    console.error('Caught error:', err);
  } finally {
    await sequelize.close();
  }
}

run();
