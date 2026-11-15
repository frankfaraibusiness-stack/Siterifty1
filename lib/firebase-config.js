// Public identifiers for the Firebase project "itzhoyoo-bc993".
//
// Nothing here is a secret: these values ship in every Firebase web app and
// only say *which* project to talk to. Access is controlled by Firebase
// Security Rules and by the Admin SDK service account, never by this file.
//
// The only real secrets are the three Admin SDK credentials, which must live
// in Vercel environment variables (and .env.local for local dev) only:
//   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
//
// Each value below can still be overridden with an env var of the same name
// as before (handy for a staging project), but nothing needs to be set.
export const firebaseConfig = {
  apiKey: process.env.FIREBASE_WEB_API_KEY || "AIzaSyANoAqWmdlBxX2nsXOLjvqu2ZcsWxdy26Q",
  authDomain: "itzhoyoo-bc993.firebaseapp.com",
  projectId: "itzhoyoo-bc993",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "itzhoyoo-bc993.firebasestorage.app",
  messagingSenderId: "487951415093",
  appId: "1:487951415093:web:50d52da26d852f12cf3e7c",
};
