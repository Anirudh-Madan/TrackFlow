/**
 * test_sales_report.js — test script to verify report calculations and database queries
 */
const { belowDlReport } = require('../modules/reports/reports.controller');
const { OrderItem, Product } = require('../models');

async function setupTestData() {
  console.log('Modifying test data to ensure some items sell below DL (with positive selling prices)...');
  // Find items where product is set and product has a dealer_landing_price
  const items = await OrderItem.findAll({
    include: [{ model: Product, as: 'product' }],
    limit: 5
  });

  for (const item of items) {
    const dl = parseFloat(item.dl_price || item.product?.dealer_landing_price || 0);
    if (dl > 0) {
      const newSmPrice = Math.round(dl * 0.8 * 100) / 100; // 20% loss, positive selling price
      await item.update({
        dl_price: dl,
        sm_price: newSmPrice,
        line_total: item.quantity * newSmPrice
      });
      console.log(`Updated Item ID ${item.id} (${item.product?.sku || 'Custom'}): DL = ${dl}, Sold At = ${newSmPrice}`);
    }
  }
}

// Mock request and response
const req = {
  query: {
    startDate: '2026-05-01',
    endDate: '2026-07-10',
    searchPart: '',
    searchChallan: '',
    salesManagerId: ''
  }
};

const res = {
  json: (output) => {
    console.log('✅  API executed successfully!');
    console.log(`Found ${output.data.length} transactions sold below DL:`);
    console.log(JSON.stringify(output.data.slice(0, 3), null, 2)); // show first 3
    process.exit(0);
  },
  status: (code) => {
    console.error(`❌  API returned status code: ${code}`);
    return res;
  }
};

const next = (err) => {
  console.error('❌  API threw an error during execution:');
  console.error(err);
  process.exit(1);
};

async function main() {
  await setupTestData();
  console.log('Running below-DL transactions report query test...');
  await belowDlReport(req, res, next);
}

main().catch(err => {
  console.error('Unhandled rejection:', err);
  process.exit(1);
});
