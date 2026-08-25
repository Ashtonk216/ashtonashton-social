import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Feed from './Feed';
import AdminPanel from './AdminPanel';
import { API_URL, AUTH_URL } from './config';

function App() {
  const [status, setStatus] = useState('loading'); // 'loading' | 'authed' | 'unauthed'
  const [identity, setIdentity] = useState(null); // { username, role }

  // If ForwardAuth is wired correctly, an unauthenticated browser never
  // reaches this app at all -- Traefik redirects to auth-service's /login
  // before any JS here runs. This check exists as a defense-in-depth /
  // loading-state concern, not the primary auth gate.
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${API_URL}/me`, { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setIdentity(data);
          setStatus('authed');
        } else {
          setStatus('unauthed');
        }
      } catch (err) {
        setStatus('unauthed');
      }
    };
    checkAuth();
  }, []);

  // Access tokens are short-lived (15 min); without this, the ForwardAuth
  // cookie silently expires mid-session and the next request bounces to
  // login. Refresh well before expiry, on an interval, for as long as the
  // tab is open.
  useEffect(() => {
    if (status !== 'authed') return;
    const interval = setInterval(() => {
      fetch(`${AUTH_URL}/auth/refresh`, { method: 'POST', credentials: 'include' }).catch(() => {
        // Silent fail -- if the refresh token itself has expired, the next
        // real request will 401 and Traefik will redirect to login as normal.
      });
    }, 10 * 60 * 1000); // every 10 min, ahead of the 15-min access token TTL
    return () => clearInterval(interval);
  }, [status]);

  const handleLogout = async () => {
    await fetch(`${AUTH_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
    window.location.href = `${AUTH_URL}/login?rd=${encodeURIComponent(window.location.href)}`;
  };

  if (status === 'loading') {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
  }

  if (status === 'unauthed') {
    // Shouldn't normally be reached (Traefik redirects first), but if it is,
    // send the browser to auth-service's login page manually.
    window.location.href = `${AUTH_URL}/login?rd=${encodeURIComponent(window.location.href)}`;
    return null;
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/admin"
          element={
            identity.role === 'super' ?
            <AdminPanel /> :
            <Navigate to="/" replace />
          }
        />
        <Route
          path="/"
          element={<Feed identity={identity} onLogout={handleLogout} />}
        />
      </Routes>
    </Router>
  );
}

export default App;
