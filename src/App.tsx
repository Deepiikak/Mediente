import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { AuthProvider } from './hooks/useAuth';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUserManagement from './pages/admin/AdminUserManagement';
import AdminTeams from './pages/admin/AdminTeams';
import { AdminDepartmentManagementPage } from './pages/admin/AdminDepartments';

import AdminCallSheet from './pages/admin/AdminCallSheet';
import AdminRoles from './pages/admin/AdminRoles';
import './App.css'
// Import Mantine styles
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';
import AdminLayout from './components/AdminLayout';
import TemplatesPage from './pages/admin/templatesPage';
import Projects from './pages/admin/projects';
import ProjectDetail from './pages/admin/ProjectDetail';

function App() {
  return (
    <MantineProvider>
      <Notifications />
      <AuthProvider>
        <Router>
          <Routes>
            {/* Redirect root to admin login */}
            <Route path="/" element={<Navigate to="/admin/login" replace />} />
            
            {/* Admin routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="users" element={<AdminUserManagement />} />
              <Route path="projects" element={<Projects />} />
              <Route path="projects/:projectId" element={<ProjectDetail />} />
              <Route path="teams" element={<AdminTeams />} />
              <Route path="departments" element={<AdminDepartmentManagementPage />} />
              <Route path="roles" element={<AdminRoles />} />
              <Route path="crew" element={<AdminUserManagement />} />
              <Route path="templates" element={<TemplatesPage />} />
              <Route path="callsheet" element={<AdminCallSheet />} />
              
              {/* Other navigation routes - redirect to dashboard for now */}
              <Route path="calendar" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="settings" element={<Navigate to="/admin/dashboard" replace />} />
            </Route>
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/admin/login" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </MantineProvider>
  );
}

export default App;