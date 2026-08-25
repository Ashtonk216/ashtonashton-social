import { AUTH_URL } from './config';

// Thin wrapper around fetch that treats a 401 as "the session died" rather
// than an app-level error. Without this, a stale/expired access token
// (e.g. after the tab was backgrounded past the refresh window) surfaces as
// a generic "Failed to load feed" / "Failed to delete post" error message
// scattered across the UI, which looks like a real bug rather than what it
// actually is: you got logged out. Redirect straight to login instead.
//
// Every fetch() call in this app that hits a ForwardAuth-gated endpoint
// should go through this instead of the raw fetch().
export async function authFetch(url, options) {
  const response = await fetch(url, { credentials: 'include', ...options });
  if (response.status === 401) {
    window.location.href = `${AUTH_URL}/login?rd=${encodeURIComponent(window.location.href)}`;
    // Never resolves -- the redirect above is already in flight, and
    // nothing downstream should keep running against a dead session.
    return new Promise(() => {});
  }
  return response;
}
