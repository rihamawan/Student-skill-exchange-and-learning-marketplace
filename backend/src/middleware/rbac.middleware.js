/**
 * src/middleware/rbac.middleware.js
 * Role-based access: allow only certain roles.
 * Roles from DB: student (Student), admin (Admin.AdminLevel='standard', one per university), superadmin (Admin.AdminLevel='superadmin', single platform-wide).
 * Admin can only see/act on students at their university; superadmin can act on any user.
 */

const userService = require('../services/user.service');

/**
 * Returns middleware that allows only the given roles.
 * Must be used after requireAuth.
 *
 * @param {...string} allowedRoles - One or more roles, e.g. 'admin', 'student', 'superadmin'
 * @returns {function} Express middleware
 */
function requireRoles(...allowedRoles) {
  if (allowedRoles.length === 0) {
    throw new Error('requireRoles: at least one role must be specified');
  }

  const set = new Set(allowedRoles.map((r) => String(r).toLowerCase()));

  return function rbacMiddleware(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const userRole = req.user.role ?? '';
    const normalizedRole = String(userRole).toLowerCase();

    if (!set.has(normalizedRole)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
    }

    next();
  };
}

/**
 * Allow if: (1) self, or (2) superadmin (any user), or (3) admin and target is a student at admin's university.
 * Must be used after requireAuth and on routes with :id param.
 */
async function requireSelfOrSuperadminOrAdminForUni(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  const requestedId = Number(req.params.id);
  const isSelf = requestedId === req.user.UserID;
  const role = String(req.user.role ?? '').toLowerCase();

  if (isSelf) return next();
  if (role === 'superadmin') return next();

  if (role === 'admin') {
    const universityId = req.user.adminUniversityID;
    if (universityId == null) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }
    const allowed = await userService.isStudentAtUniversity(requestedId, universityId);
    if (allowed) return next();
  }

  return res.status(403).json({ success: false, error: 'Insufficient permissions' });
}

module.exports = {
  requireRoles,
  requireSelfOrSuperadminOrAdminForUni,
};
