export function dashboardPathForRole(role) {
  const r = String(role || '').toLowerCase();
  if (r === 'admin') return '/admin';
  if (r === 'superadmin') return '/superadmin';
  if (r === 'student') return '/student';
  return '/forbidden';
}
