import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CheckInOut from './pages/CheckInOut';
import LeaveRequest from './pages/LeaveRequest';
import LeaveApproval from './pages/LeaveApproval';
import Reports from './pages/Reports';
import Employees from './pages/Employees';
import LeaveQuotas from './pages/LeaveQuotas';
import Settings from './pages/Settings';
import ChangePassword from './pages/ChangePassword';
import Announcements from './pages/Announcements';
import Layout from './components/Layout';
import InstallPrompt from './components/InstallPrompt';
import { isAdmin, isManagerOrAdmin } from './utils/roles';

export interface Employee {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  department_id: number;
  department_name: string;
  role: string;
  avatar?: string;
}

function App() {
  const [user, setUser] = useState<Employee | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  const handleLogin = (employee: Employee) => {
    setUser(employee);
    localStorage.setItem('user', JSON.stringify(employee));
  };

  const handleUserUpdate = (updates: Partial<Employee>) => {
    if (user) {
      const updated = { ...user, ...updates };
      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard user={user} onUserUpdate={handleUserUpdate} />} />
          <Route path="/checkinout" element={<CheckInOut user={user} />} />
          <Route path="/leave" element={<LeaveRequest user={user} />} />
          {isManagerOrAdmin(user.role) && (
            <Route path="/approval" element={<LeaveApproval user={user} />} />
          )}
          <Route path="/reports" element={<Reports user={user} />} />
          {isAdmin(user.role) && (
            <Route path="/employees" element={<Employees />} />
          )}
          {isAdmin(user.role) && (
            <Route path="/leave-quotas" element={<LeaveQuotas />} />
          )}
          {isAdmin(user.role) && (
            <Route path="/settings" element={<Settings />} />
          )}
          <Route path="/change-password" element={<ChangePassword user={user} />} />
          <Route path="/announcements" element={<Announcements user={user} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
      <InstallPrompt />
    </Router>
  );
}

export default App;

