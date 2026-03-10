/**
 * src/middleware/auth.middleware.js
 * Protects routes: reads JWT from Authorization header, verifies it, loads user, attaches to req.user.
 */

const authService = require('../services/auth.service');
const userService = require('../services/user.service');

/**
 * Express middleware: require a valid JWT and set req.user.
 * - Expects header: Authorization: Bearer <token>
 * - Verifies token, loads user by payload.userId, attaches user (without password) to req.user.
 * - Sends 401 if missing/invalid token or user not found.
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return res.status(401).json({ success: false, error: 'Missing token' });
    }

    const payload = authService.verifyToken(token);
    const userId = payload.userId ?? payload.UserID;
    if (userId == null) {
      return res.status(401).json({ success: false, error: 'Invalid token payload' });
    }

    const user = await userService.getUserById(Number(userId));
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    const { PasswordHash, ...userWithoutPassword } = user;
    req.user = userWithoutPassword;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
    next(err);
  }
}

module.exports = {
  requireAuth,
};
