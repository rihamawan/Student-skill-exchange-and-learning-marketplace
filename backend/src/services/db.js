/**
 * src/services/db.js
 * MySQL connection pool. Created lazily on first use so process.env is loaded (dotenv runs first).
 */

const mysql = require('mysql2/promise');

let pool = null;

/**
 * Get the connection pool. Creates it on first call (so .env is definitely loaded).
 * @returns {import('mysql2/promise').Pool}
 */
function getPool() {
  if (!pool) {
    const password = process.env.DB_PASSWORD;
    const passwordStatus =
      password === undefined ? 'undefined' : password === '' ? 'empty' : 'set';
    console.log(
      `DB pool creating: ${process.env.DB_USER}@${process.env.DB_HOST}/${process.env.DB_NAME} (password: ${passwordStatus})`
    );
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      user: process.env.DB_USER || 'root',
      password: password !== undefined ? password : '',
      database: process.env.DB_NAME || 'skill_exchange_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return pool;
}

module.exports = { getPool };
