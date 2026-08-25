# social-app

React frontend for ashtonashton.net — the social feed UI. Talks to the
[social backend](../ashtonashton-backend/social) and to
[auth-service](../home-server-auth) for identity, including a full admin
panel at `/admin`.

## Auth model

No local login/register/session code here at all. The browser's session is
a cookie set by auth-service, scoped to `.ashtonashton.net` — Traefik's
ForwardAuth gates every request to this domain before it ever reaches this
app, so an unauthenticated visitor never actually loads this React app; they
get redirected to auth-service's `/login` first.

`App.js`'s own `/api/me` check on mount is a defense-in-depth / loading-state
concern, not the real auth gate — it also determines whether the "Admin
Panel" button and `/admin` route are reachable, based on `role === 'super'`
from that response. Two things keep the session alive while a tab is open:

- A `setInterval` every 10 minutes calls auth-service's `/auth/refresh`,
  well ahead of the 15-minute access token TTL.
- A `visibilitychange` listener does the same refresh immediately when the
  tab becomes visible again — the interval alone isn't enough, since
  browsers throttle/suspend `setInterval` in backgrounded tabs. This matters
  more here than in most apps: `Feed.js` auto-refreshes the feed every 15
  seconds, so a stale token would otherwise surface almost immediately after
  returning to a backgrounded tab.

All API calls to the backend and to auth-service's `/admin/*` go through
`authFetch` (`src/authFetch.js`) instead of raw `fetch` — it redirects
straight to login on a `401` instead of letting a stale/expired token
surface as a confusing "Failed to load feed" error somewhere in the UI. A
`403` (logged in, but not `super`) is left alone — that's a real
"you're not an admin" case, not a dead session, and is handled separately in
`AdminPanel.js`.

## Admin panel (`/admin`, `super` role only)

Three tabs:
- **Users** — list, ban, unban. Calls auth-service's `/admin/users*`
  directly (cross-origin from `ashtonashton.net`; auth-service's CORS config
  allows this origin with credentials).
- **Posts** — moderation view of all posts with delete, calls this app's own
  `/api/admin/feed` / `/api/admin/posts/{id}`.
- **Password Resets** — approve/deny pending self-service password reset
  requests (see auth-service's README for the full flow). Calls
  auth-service's `/admin/password-resets*`.

## Configuration

`src/config.js` reads `REACT_APP_API_URL` / `REACT_APP_AUTH_URL` at build
time (Create React App's standard mechanism), sourced from `.env.production`
for `npm run build` and `.env.development`/hardcoded fallback for `npm
start`. There's no runtime toggle to forget before building — a previous
version of this file used a manually-commented-out line for the prod URL,
which silently shipped `localhost` into a production build once; don't
reintroduce that pattern.

## Local development

```bash
npm install
npm start
```

Runs against `http://localhost:8001` by default (the social backend, run
separately — see its own README). There's no ForwardAuth locally, so the
backend needs to be running with hand-set identity headers or you'll just
see 401s — see the backend README for how to simulate that with curl, or
just point `REACT_APP_API_URL`/`REACT_APP_AUTH_URL` at the real deployed
services if you only need to work on the frontend.

## Deployment

Multi-stage Dockerfile: `npm run build` in a Node stage, served by
`nginx-unprivileged` on port 8080 (non-root). `nginx.conf` does SPA
fallback (`try_files ... /index.html`) so a hard refresh on `/admin` or any
other client route doesn't 404, plus an unauthenticated `/health` endpoint
for k8s probes.

```bash
docker buildx build --platform linux/amd64 -t ashtonk216/ashtonashton-social-frontend:X.Y.Z --push .
# bump helm/values.yaml image.tag, then:
helm upgrade ashtonashton-social-frontend ./helm -n web
```

`--platform linux/amd64` matters — the k3s node is amd64; building on Apple
Silicon without this flag produces an image that fails with
`exec format error` at container start.

Helm chart in `helm/` — Deployment + Service only, no PVC (stateless static
files baked into the image at build time).

Traefik routes `ashtonashton.net`'s `/api/*` paths to the backend Service
and everything else to this frontend's Service, via a plain
`kubectl apply`'d IngressRoute (not part of this chart) — see the backend
repo's README for the exact routing rule.
