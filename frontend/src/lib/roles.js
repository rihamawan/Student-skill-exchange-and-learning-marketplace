export function dashboardPathForRole(role) {
  const r = String(role || '').toLowerCase();
  if (r === 'admin') return '/admin';
  if (r === 'superadmin') return '/superadmin';
  if (r === 'student') return '/student';
  // If role is missing/unknown (e.g. bad token or registering without a Student row),
  // send the user to login instead of creating a forbidden-loop.
  return '/login';
}

export const VALID_ROLES = ['student', 'admin', 'superadmin'];

export function isValidRole(role) {
  const r = String(role || '').toLowerCase();
  return VALID_ROLES.includes(r);
}
