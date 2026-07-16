require('dotenv').config()
const { Sequelize } = require('sequelize')

const seq = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST || 'localhost',
  dialect: 'mysql',
  logging: false,
})

async function unlock() {
  try {
    await seq.authenticate()

    // DELETE all lockout rows for these users (by any IP)
    const [, meta] = await seq.query(
      `DELETE FROM login_attempt WHERE login_id IN ('sm_ravi', 'im_suresh', 'admin')`
    )
    console.log('✅ Deleted lockout rows:', meta.affectedRows)

    // Show all remaining rows to confirm
    const [rows] = await seq.query(
      `SELECT login_id, attempt_count, locked_until, ip_address, last_attempt_at FROM login_attempt`
    )
    if (rows.length === 0) {
      console.log('✅ login_attempt table is now empty (all lockouts cleared).')
    } else {
      console.log('Remaining login_attempt rows:')
      console.table(rows)
    }
  } catch (e) {
    console.error('❌ Error:', e.message)
  } finally {
    await seq.close()
  }
}

unlock()
