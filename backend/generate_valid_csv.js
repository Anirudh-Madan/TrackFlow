const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function getSkus() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Sree@5678',
      database: 'erp_db'
    });

    const [rows] = await connection.execute('SELECT sku FROM product LIMIT 3');
    if (rows.length === 0) {
      console.log('No products found in DB');
      process.exit(0);
    }

    let csvContent = "sku,purchase_price,selling_price,dealer_landing_price,quantity\n";
    let index = 1;
    for (const row of rows) {
      csvContent += `${row.sku},${100 * index},${150 * index},${120 * index},${50 * index}\n`;
      index++;
    }

    fs.writeFileSync(path.join(__dirname, 'dummy_products_import.csv'), csvContent);
    console.log('Successfully updated CSV with valid SKUs from DB');
    connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

getSkus();
