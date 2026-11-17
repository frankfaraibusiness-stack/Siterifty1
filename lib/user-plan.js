import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { DEFAULT_PLAN, isPlanId } from "@/lib/plans";

// users/{uid}.plan is one of the ids in lib/plans.js. Accounts created before
// plans existed have no field, so they read as the free plan.
export async function getUserPlan(uid) {
  if (!uid) return DEFAULT_PLAN;
  const snap = await getAdminDb().collection("users").doc(uid).get();
  const plan = snap.exists ? snap.data().plan : null;
  return isPlanId(plan) ? plan : DEFAULT_PLAN;
}

export async function setUserPlan(uid, plan) {
  await getAdminDb()
    .collection("users")
    .doc(uid)
    .set({ plan, planUpdatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return plan;
}
