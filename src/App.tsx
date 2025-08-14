import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { AuthProvider } from './hooks/useAuth';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUserManagement from './pages/admin/AdminUserManagement';
import AdminProjects from './pages/admin/AdminProjects';
import AdminTeams from './pages/admin/AdminTeams';
import AdminCrew from './pages/admin/AdminCrew';
import AdminTemplate from './pages/admin/AdminTemplate';

// Import Mantine styles
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

function App() {
  return (
    <MantineProvider defaultColorScheme="light">
      <Notifications />
      <AuthProvider>
        <Router>
          <Routes>
            {/* Redirect root to admin login */}
            <Route path="/" element={<Navigate to="/admin/login" replace />} />
            
            {/* Admin routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUserManagement />} />
            <Route path="/admin/projects" element={<AdminProjects />} />
            <Route path="/admin/teams" element={<AdminTeams />} />
            <Route path="/admin/crew" element={<AdminCrew />} />
            <Route path="/admin/templates" element={<AdminTemplate />} />
            

            
            {/* Other navigation routes - redirect to dashboard for now */}
            <Route path="/admin/calendar" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/departments" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/settings" element={<Navigate to="/admin/dashboard" replace />} />
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/admin/login" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </MantineProvider>
  );
}

export default App;