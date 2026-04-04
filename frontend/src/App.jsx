import { Route, Routes } from 'react-router-dom';
import { BackendStatusBanner } from './components/feedback/BackendStatusBanner';
import { AppLayout } from './components/layout/AppLayout';
import { RequireAuth } from './components/layout/RequireAuth';
import { RequireRole } from './components/layout/RequireRole';
import { AdminDashboard } from './pages/dashboards/AdminDashboard';
import { StudentDashboard } from './pages/dashboards/StudentDashboard';
import { SuperadminDashboard } from './pages/dashboards/SuperadminDashboard';
import { ForbiddenPage } from './pages/ForbiddenPage';
import { HomeRedirect } from './pages/HomeRedirect';
import { LoginPage } from './pages/LoginPage';
import { ConversationsPage } from './pages/ConversationsPage';
import { RegisterPage } from './pages/RegisterPage';
import { ReportsPage } from './pages/ReportsPage';
import { MatchIntakePage } from './pages/MatchIntakePage';
import { ConfirmExchangePage } from './pages/ConfirmExchangePage';
import { OfferedSkillsPage } from './pages/OfferedSkillsPage';
import { RequestedSkillsPage } from './pages/RequestedSkillsPage';
import { ExchangesPage } from './pages/ExchangesPage';
import { TransactionDemoPage } from './pages/TransactionDemoPage';
import { SkillQuizPage } from './pages/SkillQuizPage';
import { AdminStudentsPage } from './pages/admin/AdminStudentsPage';
import { AdminEvaluationsPage } from './pages/admin/AdminEvaluationsPage';
import { UniversitiesManagePage } from './pages/superadmin/UniversitiesManagePage';
import { SkillsManagePage } from './pages/superadmin/SkillsManagePage';
import { AdminsManagePage } from './pages/superadmin/AdminsManagePage';
import { RequireStudentVerified } from './components/layout/RequireStudentVerified';

const STUDENT_NAV = [
  { to: '/student', label: 'Dashboard' },
  { to: '/student/match-profile', label: 'Profile & matching' },
  { to: '/student/offered-skills', label: 'Offered skills' },
  { to: '/student/requested-skills', label: 'Requested skills' },
  { to: '/student/conversations', label: 'Conversations' },
  { to: '/student/exchanges', label: 'Exchanges' },
  { to: '/student/transaction-demo', label: 'Transaction demo' },
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
        <RequireStudentVerified>
          <AppLayout navItems={STUDENT_NAV} />
        </RequireStudentVerified>
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
    <>
      <BackendStatusBanner />
      <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forbidden" element={<ForbiddenPage />} />
      <Route path="/" element={<HomeRedirect />} />

      <Route path="/student" element={<StudentShell />}>
        <Route index element={<StudentDashboard />} />
        <Route path="offered-skills" element={<OfferedSkillsPage />} />
        <Route path="requested-skills" element={<RequestedSkillsPage />} />
        <Route path="conversations" element={<ConversationsPage />} />
        <Route path="match-profile" element={<MatchIntakePage />} />
        <Route path="confirm-exchange/:conversationId" element={<ConfirmExchangePage />} />
        <Route path="exchanges" element={<ExchangesPage />} />
        <Route path="transaction-demo" element={<TransactionDemoPage />} />
        <Route path="quiz/:skillId" element={<SkillQuizPage />} />
      </Route>

      <Route path="/admin" element={<AdminShell />}>
        <Route index element={<AdminDashboard />} />
        <Route path="students" element={<AdminStudentsPage />} />
        <Route path="reports" element={<ReportsPage scope="admin" />} />
        <Route path="evaluations" element={<AdminEvaluationsPage />} />
      </Route>

      <Route path="/superadmin" element={<SuperShell />}>
        <Route index element={<SuperadminDashboard />} />
        <Route path="universities" element={<UniversitiesManagePage />} />
        <Route path="skills" element={<SkillsManagePage />} />
        <Route path="admins" element={<AdminsManagePage />} />
        <Route path="reports" element={<ReportsPage scope="superadmin" />} />
      </Route>

      <Route path="*" element={<ForbiddenPage />} />
    </Routes>
    </>
  );
}
