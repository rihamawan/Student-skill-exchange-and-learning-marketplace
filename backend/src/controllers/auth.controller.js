/**
 * src/controllers/auth.controller.js
 * Login and register. Returns { user, token } on success.
 */

const authService = require('../services/auth.service');
const userService = require('../services/user.service');
const universityService = require('../services/university.service');

/** Strip password and shape for API */
function toAuthUser(row) {
  if (!row) return null;
  const { PasswordHash, ...rest } = row;
  return { id: rest.UserID, email: rest.Email, fullName: rest.FullName, role: rest.role, phoneNumber: rest.PhoneNumber ?? null };
}

function emailDomain(email) {
  const str = String(email ?? '').trim().toLowerCase();
  const at = str.lastIndexOf('@');
  if (at === -1) return null;
  return str.slice(at + 1) || null;
}

/**
 * POST /auth/register - create account, return user + JWT.
 * If body.universityId is provided, also creates a Student row so the user gets role 'student'
 * and can use student-only routes (e.g. create offered skills).
 */
async function register(req, res) {
  try {
    const { email, password, fullName, phoneNumber, universityId } = req.body;

    // If registering as a student with a universityId, enforce that email domain matches
    // that university's allowed domain (derived from University.ContactEmail domain).
    // This prevents registering gmail.com under an institutional university.
    if (universityId != null) {
      const uni = await universityService.getById(Number(universityId));
      if (!uni) {
        return res.status(400).json({ success: false, error: 'Invalid universityId' });
      }
      const expectedDomain = emailDomain(uni?.ContactEmail);
      const studentDomain = emailDomain(email);
      if (expectedDomain && studentDomain && !studentDomain.endsWith(expectedDomain)) {
        return res.status(400).json({ success: false, error: 'Email domain must match selected university' });
      }
    }

    const passwordHash = await authService.hashPassword(password);
    let created = await userService.createUser({
      email,
      passwordHash,
      fullName,
      phoneNumber: phoneNumber || null,
    });
    if (universityId != null) {
      await userService.createStudent(created.UserID, Number(universityId));
      created = await userService.getUserById(created.UserID);
    }
    const user = toAuthUser(created);
    const token = authService.signToken({
      userId: created.UserID,
      email: created.Email,
      role: created.role,
    });
    res.status(201).json({ success: true, data: { user, token } });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, error: 'Email already in use' });
    }
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ success: false, error: 'Invalid universityId' });
    }
    console.error('auth.register', err);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
}

/**
 * POST /auth/login - validate email/password, return user + JWT
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;
    const userRow = await userService.getUserByEmail(email);
    if (!userRow) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }
    const match = await authService.comparePassword(password, userRow.PasswordHash);
    if (!match) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }
    await userService.updateLastLogin(userRow.UserID);
    const user = toAuthUser(userRow);
    const token = authService.signToken({
      userId: userRow.UserID,
      email: userRow.Email,
      role: userRow.role,
    });
    res.status(200).json({ success: true, data: { user, token } });
  } catch (err) {
    console.error('auth.login', err);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
}

module.exports = {
  register,
  login,
};
