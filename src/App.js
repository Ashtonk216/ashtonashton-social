import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './Login';
import Register from './Register';
import Feed from './Feed';
import ChangePassword from './ChangePassword';
import AdminPanel from './AdminPanel';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setIsAuthenticated(false);
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ?
            <Navigate to="/" replace /> :
            <Login onLoginSuccess={handleLoginSuccess} />
          }
        />
        <Route
          path="/register"
          element={
            isAuthenticated ?
            <Navigate to="/" replace /> :
            <Register />
          }
        />
        <Route
          path="/change-password"
          element={
            isAuthenticated ?
            <ChangePassword /> :
            <Navigate to="/login" replace />
          }
        />
        <Route
          path="/admin"
          element={
            isAuthenticated ?
            <AdminPanel /> :
            <Navigate to="/login" replace />
          }
        />
        <Route
          path="/"
          element={
            isAuthenticated ?
            <Feed onLogout={handleLogout} /> :
            <Navigate to="/login" replace />
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
