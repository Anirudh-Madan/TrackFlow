const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('http://localhost:3000/api/v1/products/bulk-import', {
      items: [
        { sku: 'SK-004', purchase_price: 110, selling_price: 160, dealer_landing_price: 130, quantity: 75, name: 'Existing SK4' },
        { sku: 'SKU-NEW-1', purchase_price: 50, selling_price: 100, dealer_landing_price: 75, quantity: 2, name: 'New Hammer' },
        { sku: 'SKU-NEW-2', purchase_price: 150, selling_price: 250, dealer_landing_price: 200, quantity: 0, name: 'Wrench Set' },
        { sku: 'SKU-NEW-3', purchase_price: 10, selling_price: 30, dealer_landing_price: 20, quantity: 500, name: 'Nails Pack' }
      ],
      stock_mode: 'absolute'
    }, {
      headers: {
        // Need to simulate a user session. Let's look at how the backend authenticates.
        // If it requires a JWT, I'll need to generate one or bypass it.
      }
    });
    console.log("SUCCESS:", res.data);
  } catch (err) {
    console.log("ERROR:", err.response ? err.response.data : err.message);
  }
}

test();
