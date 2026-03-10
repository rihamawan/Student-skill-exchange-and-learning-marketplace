/**
 * src/services/transactions.js
 * Transaction helper: get a connection, BEGIN, run callback, COMMIT or ROLLBACK.
 * Use for any operation that must be atomic (e.g. match request + create exchange + session).
 */

const { getPool } = require('./db');

/**
 * Run a callback inside a database transaction.
 * - Gets a connection from the pool
 * - Starts a transaction (BEGIN)
 * - Runs callback(connection) — use connection.query() for all SQL
 * - On success: COMMIT and return the callback result
 * - On error: ROLLBACK and rethrow
 * - Always releases the connection back to the pool
 *
 * @param {function(connection): Promise<any>} callback - Async function that receives the connection
 * @returns {Promise<any>} - Whatever the callback returns (after COMMIT)
 */
async function withTransaction(callback) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    console.error('[Transaction] ROLLBACK —', err.message || err.code || err);
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = { withTransaction };
