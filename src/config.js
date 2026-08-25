// API Configuration
// Driven by REACT_APP_API_URL / REACT_APP_AUTH_URL at build time (see
// .env.production) so there's no manual toggle to forget before building
// for production -- `npm run build` picks up .env.production automatically,
// `npm start` picks up .env.development.

export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001/api';
export const AUTH_URL = process.env.REACT_APP_AUTH_URL || 'https://auth.ashtonashton.net';
