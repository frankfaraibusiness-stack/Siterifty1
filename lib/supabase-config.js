// Public Supabase settings. Both values are safe to ship in the browser bundle
// (the publishable key is public by design), so they live here, like
// lib/firebase-config.js, instead of in environment variables.
// The SECRET key is the only Supabase value that must stay in env
// (SUPABASE_SECRET_KEY). Env vars below are optional overrides.
export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://rjsjyelsetqcfumvqjjp.supabase.co",
  publishableKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_fcuI5gFNttnZxKUFZ34h4w_mY2Vj3Dm",
};
