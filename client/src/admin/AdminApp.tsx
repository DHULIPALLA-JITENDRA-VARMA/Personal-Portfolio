import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { PageState } from '../components/PageState';
import { AuthProvider, useAuth } from './auth';
import { AchievementsPage, CertificationsPage, EducationPage, ExperiencePage, SkillsPage } from './collections';
import Dashboard from './Dashboard';
import Layout from './Layout';
import Login from './Login';
import MessagesPage from './MessagesPage';
import ProfilePage from './ProfilePage';
import ProjectsPage from './ProjectsPage';
import ResumePage from './ResumePage';

// Gate for every admin route: unauthenticated visitors are sent to the login page, and the
// page they wanted is remembered so they land there after signing in.
function Protected() {
  const { state } = useAuth();
  const location = useLocation();
  if (state.status === 'checking') return <PageState title="Checking session" loading />;
  if (state.status === 'anonymous') return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export default function AdminApp() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<Login />} />
        <Route element={<Protected />}>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="skills" element={<SkillsPage />} />
            <Route path="experience" element={<ExperiencePage />} />
            <Route path="education" element={<EducationPage />} />
            <Route path="certifications" element={<CertificationsPage />} />
            <Route path="achievements" element={<AchievementsPage />} />
            <Route path="resume" element={<ResumePage />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}
