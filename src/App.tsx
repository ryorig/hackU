import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { AuthForm } from './components/AuthForm';
import { WardrobePage } from './pages/WardrobePage';
import { CoordinationPage } from './pages/CoordinationPage';
import { TimetablePage } from './pages/TimetablePage';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">読み込み中...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/wardrobe" replace />} />
        <Route path="/wardrobe" element={<WardrobePage />} />
        <Route path="/coordination" element={<CoordinationPage />} />
        <Route path="/timetable" element={<TimetablePage />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;