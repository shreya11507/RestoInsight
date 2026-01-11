
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import TeamAnalytics from './pages/TeamAnalytics';
import AnomalyCenter from './pages/AnomalyCenter';
import GuestInsights from './pages/GuestInsights';
import EmotionalKPIs from './pages/EmotionalKPIs';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="team" element={<TeamAnalytics />} />
          <Route path="anomalies" element={<AnomalyCenter />} />
          <Route path="insights" element={<GuestInsights />} />
          <Route path="kpis" element={<EmotionalKPIs />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
