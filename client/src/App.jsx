import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useStore } from './store/useStore';

import Login from './pages/Login';
import Register from './pages/Register';
import Today from './pages/Today';
import Plan from './pages/Plan';
import Review from './pages/Review';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Settings from './pages/Settings';

import Layout from './components/Layout';
import CheckInModal from './components/CheckInModal';

function ProtectedRoute({ children }) {
  const token = useStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const theme = useStore((s) => s.theme);
  const showCheckinModal = useStore((s) => s.showCheckinModal);
  const initTheme = useStore((s) => s.initTheme);

  useEffect(() => {
    initTheme();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <BrowserRouter>
      {showCheckinModal && <CheckInModal />}

      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/today" replace />} />

        {/* Protected routes wrapped in Layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="today" element={<Today />} />
          <Route path="plan" element={<Plan />} />
          <Route path="review" element={<Review />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="history" element={<History />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
