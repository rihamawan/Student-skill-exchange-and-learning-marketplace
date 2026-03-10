/**
 * src/services/payment.service.js
 * Payment: list (admin/superadmin or by exchange), get one.
 */

const { getPool } = require('./db');

async function getById(paymentId) {
  const [rows] = await getPool().query(
    `SELECT p.PaymentID, p.ExchangeID, p.Amount, p.PaymentStatus, p.PaymentMethod, p.PaidAt, p.CreatedAt,
            e.ExchangeType
     FROM Payment p
     JOIN Exchange e ON e.ExchangeID = p.ExchangeID
     WHERE p.PaymentID = ?`,
    [paymentId]
  );
  return rows[0] ?? null;
}

async function getByExchange(exchangeId) {
  const [rows] = await getPool().query(
    'SELECT PaymentID, ExchangeID, Amount, PaymentStatus, PaymentMethod, PaidAt, CreatedAt FROM Payment WHERE ExchangeID = ?',
    [exchangeId]
  );
  return rows;
}

async function getAll(limit = 100) {
  const [rows] = await getPool().query(
    `SELECT p.PaymentID, p.ExchangeID, p.Amount, p.PaymentStatus, p.PaymentMethod, p.PaidAt, p.CreatedAt
     FROM Payment p
     ORDER BY p.CreatedAt DESC
     LIMIT ?`,
    [limit]
  );
  return rows;
}

/** Payments for exchanges where offerer is at the given university (admin uni-scoped). */
async function getByUniversity(universityId, limit = 100) {
  const [rows] = await getPool().query(
    `SELECT p.PaymentID, p.ExchangeID, p.Amount, p.PaymentStatus, p.PaymentMethod, p.PaidAt, p.CreatedAt
     FROM Payment p
     JOIN Exchange e ON e.ExchangeID = p.ExchangeID
     JOIN OfferedSkill os ON os.OfferID = e.OfferID
     JOIN Student s ON s.StudentID = os.StudentID
     WHERE s.UniversityID = ?
     ORDER BY p.CreatedAt DESC
     LIMIT ?`,
    [universityId, limit]
  );
  return rows;
}

module.exports = { getById, getByExchange, getAll, getByUniversity };
