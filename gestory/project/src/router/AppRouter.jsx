import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute.jsx';
import { AdminLayout } from '../ui/components/layout/AdminLayout.jsx';

// Code-splitting con lazy loading para optimización de bundle
const LoginPage = lazy(() => import('../ui/pages/LoginPage.jsx').then(m => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('../ui/pages/DashboardPage.jsx').then(m => ({ default: m.DashboardPage })));
const BigDataDashboardPage = lazy(() => import('../ui/pages/BigDataDashboardPage.jsx').then(m => ({ default: m.BigDataDashboardPage })));
const MLDashboardPage = lazy(() => import('../ui/pages/MLDashboardPage.jsx').then(m => ({ default: m.MLDashboardPage })));
const EventosPage = lazy(() => import('../ui/pages/EventosPage.jsx').then(m => ({ default: m.EventosPage })));
const EdificiosPage = lazy(() => import('../ui/pages/EdificiosPage.jsx').then(m => ({ default: m.EdificiosPage })));
const CalendarioPage = lazy(() => import('../ui/pages/CalendarioPage.jsx').then(m => ({ default: m.CalendarioPage })));
const AjustesPage = lazy(() => import('../ui/pages/AjustesPage.jsx').then(m => ({ default: m.AjustesPage })));

// Componente de carga visual
function PageLoader() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '60vh',
      flexDirection: 'column',
      gap: '16px',
      color: '#0a3a60'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid rgba(10, 58, 96, 0.2)',
        borderTopColor: '#0a3a60',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <span style={{ fontSize: '14px', color: '#4b5563' }}>Cargando…</span>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export function AppRouter() {
  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
          
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="bigdata" element={<BigDataDashboardPage />} />
            <Route path="ml" element={<MLDashboardPage />} />
            <Route path="eventos" element={<EventosPage />} />
            <Route path="edificios" element={<EdificiosPage />} />
            <Route path="calendario" element={<CalendarioPage />} />
            <Route path="ajustes" element={<AjustesPage />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}