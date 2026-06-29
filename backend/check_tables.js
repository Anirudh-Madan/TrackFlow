const mysql = require('mysql2/promise');

async function checkTables() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Sree@5678',
      database: 'erp_db'
    });

    const [rows] = await connection.execute('SHOW TABLES');
    console.log(rows);
    connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkTables();
