import React, { useState, useEffect, useRef } from 'react';
import { AUTH_URL } from './config';

// currentAppId: 'social' | 'drive' | 'tube' -- matches the `id` field
// auth-service's GET /apps returns, so the current app can be marked
// disabled without string-comparing full URLs. The app list itself lives
// entirely in auth-service, not here -- see home-server-auth/app/routers/apps.py.
function AppSwitcher({ currentAppId }) {
  const [apps, setApps] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    fetch(`${AUTH_URL}/apps`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setApps)
      .catch(() => {}); // non-fatal -- switcher just won't render options
  }, []);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  if (apps.length === 0) return null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen((o) => !o)} style={{
        padding: '8px 15px', backgroundColor: '#e9ecef', color: '#212529',
        border: 'none', borderRadius: '4px', cursor: 'pointer',
      }}>
        Apps ▾
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: '4px',
          backgroundColor: 'white', border: '1px solid #dee2e6', borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)', minWidth: '140px', zIndex: 10,
        }}>
          {apps.map((app) => (
            <a
              key={app.id}
              href={app.id === currentAppId ? undefined : app.url}
              style={{
                display: 'block', padding: '10px 15px', textDecoration: 'none',
                color: app.id === currentAppId ? '#adb5bd' : '#212529',
                fontWeight: app.id === currentAppId ? 'bold' : 'normal',
                cursor: app.id === currentAppId ? 'default' : 'pointer',
              }}
            >
              {app.name}{app.id === currentAppId ? ' (current)' : ''}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default AppSwitcher;
