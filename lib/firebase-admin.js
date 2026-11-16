// Firestore + Storage only. Deliberately does NOT import "firebase-admin/auth":
// that module pulls in jwks-rsa -> jose (ESM-only), which crashes on Vercel
// with ERR_REQUIRE_ESM. Auth is handled by lib/identity-toolkit.js + lib/session.js.
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { firebaseConfig } from "@/lib/firebase-config";

export function getServiceAccount() {
  const projectId = process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. Expected FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY env vars."
    );
  }
  return { projectId, clientEmail, privateKey };
}

function getAdminApp() {
  const existing = getApps();
  if (existing.length > 0) return existing[0];
  return initializeApp({ credential: cert(getServiceAccount()) });
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export function getAdminBucket() {
  const name = firebaseConfig.storageBucket;
  if (!name) return null;
  return getStorage(getAdminApp()).bucket(name);
}
