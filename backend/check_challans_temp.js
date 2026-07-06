require('dotenv').config();
const { Sequelize } = require('sequelize');
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST || 'localhost',
  dialect: 'mysql',
  logging: false
});

async function main() {
  try {
    const [challans] = await sequelize.query(`
      SELECT c.id, c.challan_number, c.order_id, c.generated_at, 
             o.order_number, o.status, cu.company_name 
      FROM challan c 
      JOIN \`order\` o ON c.order_id = o.id 
      LEFT JOIN customer cu ON o.party_id = cu.id 
      ORDER BY c.created_at DESC LIMIT 20
    `);
    console.log('Total challans in DB:', challans.length);
    console.log(JSON.stringify(challans, null, 2));

    const [orders] = await sequelize.query(`
      SELECT id, order_number, status, party_id FROM \`order\` ORDER BY created_at DESC LIMIT 10
    `);
    console.log('\nOrders in DB:', orders.length);
    orders.forEach(o => console.log(' -', o.order_number, '|', o.status));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await sequelize.close();
  }
}
main();
