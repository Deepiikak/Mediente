import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { AuthProvider } from './hooks/useAuth';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';

// Import Mantine styles
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

function App() {
  return (
    <MantineProvider forceColorScheme="light" theme={{defaultRadius:"lg"}}>
      <Notifications />
      <AuthProvider>
        <Router>
          <Routes>
            {/* Redirect root to admin login */}
            <Route path="/" element={<Navigate to="/admin/login" replace />} />
            
            {/* Admin routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/admin/login" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </MantineProvider>
  );
}

export default App;