// lib/sitevento.ts
//
// SERVER-ONLY. Import this only from app/api/*/route.ts, never from a
// 'use client' file, or the key gets bundled into the browser.
// Hardcoded on purpose for this private test app; env vars still win if set.
// Keep the repo private, and rotate the key before this goes public.
export const SITEVENTO_API_KEY = process.env.SITEVENTO_API_KEY || 'sv_live_MezP4hemk0sQzuNJHygKwpgK4W3pnB8z';
export const SITEVENTO_API_URL = process.env.SITEVENTO_API_URL || 'https://sitevento12.vercel.app';
export const SITEVENTO_SITE_ID = process.env.SITEVENTO_SITE_ID || 'jA3c3bsLx8AlgD6EL71B';
export const SITEVENTO_INGEST_URL = `${SITEVENTO_API_URL}/api/ingest`;
