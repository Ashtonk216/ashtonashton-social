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
  //
  // The interval alone isn't enough: browsers throttle or fully suspend
  // setInterval in backgrounded tabs, so a user who switches away and comes
  // back after >15 min finds the token already dead with no refresh having
  // fired. visibilitychange fires reliably even on a suspended tab, so also
  // refresh -- and AWAIT it -- before Feed's own 15-second auto-refresh
  // interval (which stays running/re-fires the moment the tab is visible
  // again) gets a chance to fire a request against the still-stale token.
  useEffect(() => {
    if (status !== 'authed') return;

    const doRefresh = async () => {
      try {
        const response = await fetch(`${AUTH_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
        if (!response.ok) {
          // Refresh token itself is dead (e.g. >30 days away). Redirect to
          // login explicitly rather than letting a background request
          // surface a raw, uncaught 401 somewhere else in the UI.
          window.location.href = `${AUTH_URL}/login?rd=${encodeURIComponent(window.location.href)}`;
        }
      } catch (err) {
        // Network error -- leave the session as-is, the next real request
        // will surface the same failure through normal error handling.
      }
    };

    const interval = setInterval(doRefresh, 10 * 60 * 1000); // every 10 min, ahead of the 15-min access token TTL

    const onVisible = () => {
      if (document.visibilityState === 'visible') doRefresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
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
