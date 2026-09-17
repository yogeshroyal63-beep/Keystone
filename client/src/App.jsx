import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ProjectThreadPage from './pages/ProjectThreadPage';
import ProjectActionsPage from './pages/ProjectActionsPage';
import ProjectConflictsPage from './pages/ProjectConflictsPage';
import ProjectDecisionsPage from './pages/ProjectDecisionsPage';
import ProjectMemoryPage from './pages/ProjectMemoryPage';
import SettingsPage from './pages/SettingsPage';
import { useAuth } from './contexts/AuthContext';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <SignupPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/project/:id/threads"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ProjectThreadPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/project/:id/actions"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ProjectActionsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/project/:id/conflicts"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ProjectConflictsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/project/:id/decisions"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ProjectDecisionsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/project/:id/memory"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ProjectMemoryPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AppLayout>
              <SettingsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
