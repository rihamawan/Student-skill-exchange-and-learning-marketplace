import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { RequireAuth } from './components/layout/RequireAuth';
import { RequireRole } from './components/layout/RequireRole';
import { AdminDashboard } from './pages/dashboards/AdminDashboard';
import { StudentDashboard } from './pages/dashboards/StudentDashboard';
import { SuperadminDashboard } from './pages/dashboards/SuperadminDashboard';
import { ForbiddenPage } from './pages/ForbiddenPage';
import { HomeRedirect } from './pages/HomeRedirect';
import { LoginPage } from './pages/LoginPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { RegisterPage } from './pages/RegisterPage';

const STUDENT_NAV = [
  { to: '/student', label: 'Dashboard' },
  { to: '/student/offered-skills', label: 'Offered skills' },
  { to: '/student/requested-skills', label: 'Requested skills' },
  { to: '/student/conversations', label: 'Conversations' },
  { to: '/student/exchanges', label: 'Exchanges' },
];

const ADMIN_NAV = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/students', label: 'Students' },
  { to: '/admin/reports', label: 'Reports' },
  { to: '/admin/evaluations', label: 'Evaluations' },
];

const SUPER_NAV = [
  { to: '/superadmin', label: 'Dashboard' },
  { to: '/superadmin/universities', label: 'Universities' },
  { to: '/superadmin/skills', label: 'Skills' },
  { to: '/superadmin/admins', label: 'Admins' },
  { to: '/superadmin/reports', label: 'Reports' },
];

function StudentShell() {
  return (
    <RequireAuth>
      <RequireRole roles={['student']}>
        <AppLayout navItems={STUDENT_NAV} />
      </RequireRole>
    </RequireAuth>
  );
}

function AdminShell() {
  return (
    <RequireAuth>
      <RequireRole roles={['admin']}>
        <AppLayout navItems={ADMIN_NAV} />
      </RequireRole>
    </RequireAuth>
  );
}

function SuperShell() {
  return (
    <RequireAuth>
      <RequireRole roles={['superadmin']}>
        <AppLayout navItems={SUPER_NAV} />
      </RequireRole>
    </RequireAuth>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forbidden" element={<ForbiddenPage />} />
      <Route path="/" element={<HomeRedirect />} />

      <Route path="/student" element={<StudentShell />}>
        <Route index element={<StudentDashboard />} />
        <Route
          path="offered-skills"
          element={<PlaceholderPage title="Offered skills" description="Member 2: list and manage offered skills here." />}
        />
        <Route
          path="requested-skills"
          element={<PlaceholderPage title="Requested skills" description="Member 2: list and manage skill requests here." />}
        />
        <Route
          path="conversations"
          element={<PlaceholderPage title="Conversations" description="Member 2/3: messaging and real-time chat here." />}
        />
        <Route
          path="exchanges"
          element={<PlaceholderPage title="Exchanges" description="Member 2: exchanges and transaction flows here." />}
        />
      </Route>

      <Route path="/admin" element={<AdminShell />}>
        <Route index element={<AdminDashboard />} />
        <Route
          path="students"
          element={<PlaceholderPage title="Students" description="Member 2: university student list and verification." />}
        />
        <Route
          path="reports"
          element={<PlaceholderPage title="Reports" description="Member 3: charts and stats for your university." />}
        />
        <Route
          path="evaluations"
          element={<PlaceholderPage title="Skill evaluations" description="Member 2: evaluation CRUD if required." />}
        />
      </Route>

      <Route path="/superadmin" element={<SuperShell />}>
        <Route index element={<SuperadminDashboard />} />
        <Route
          path="universities"
          element={<PlaceholderPage title="Universities" description="Member 2: superadmin CRUD for universities." />}
        />
        <Route
          path="skills"
          element={<PlaceholderPage title="Skills catalog" description="Member 2: manage skills (superadmin only)." />}
        />
        <Route path="admins" element={<PlaceholderPage title="Admins" description="Member 2: manage admin users." />} />
        <Route
          path="reports"
          element={<PlaceholderPage title="Platform reports" description="Member 3: analytics dashboard." />}
        />
      </Route>

      <Route path="*" element={<ForbiddenPage />} />
    </Routes>
  );
}
