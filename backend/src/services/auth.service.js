/**
 * src/services/auth.service.js
 * Auth helpers: password hashing (bcrypt) and JWT sign/verify.
 * Used by login/register routes and auth middleware.
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

/** Salt rounds for bcrypt. Higher = more secure but slower. 10 is a good default. */
const BCRYPT_ROUNDS = 10;

/**
 * Hash a plain-text password for storage.
 * @param {string} password - Plain password (e.g. from register form)
 * @returns {Promise<string>} - Bcrypt hash (safe to store in DB)
 */
async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Compare a plain password with a stored hash (e.g. on login).
 * @param {string} password - Plain password from user
 * @param {string} hash - Stored hash from DB
 * @returns {Promise<boolean>} - true if password matches
 */
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Create a JWT for the user (e.g. after successful login).
 * @param {object} payload - Data to put in the token (e.g. { userId, email, role })
 * @returns {string} - Signed JWT
 */
function signToken(payload) {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  if (!secret) {
    throw new Error('JWT_SECRET is not set in environment');
  }
  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * Verify a JWT and return the payload (or throw if invalid/expired).
 * @param {string} token - JWT string (e.g. from Authorization header)
 * @returns {object} - Decoded payload (e.g. { userId, email, role })
 */
function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set in environment');
  }
  return jwt.verify(token, secret);
}
//export the functions
module.exports = {
  hashPassword,
  comparePassword,
  signToken,
  verifyToken,
};
