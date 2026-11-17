import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { cleanPerks } from "@/lib/perks";

// users/{uid}.perks is an array of perk ids from lib/perks.js. Accounts that
// never bought anything have no field and read as an empty list.
export async function getUserPerks(uid) {
  if (!uid) return [];
  const snap = await getAdminDb().collection("users").doc(uid).get();
  return snap.exists ? cleanPerks(snap.data().perks) : [];
}

export async function grantPerk(uid, perkId) {
  await getAdminDb()
    .collection("users")
    .doc(uid)
    .set(
      { perks: FieldValue.arrayUnion(perkId), perksUpdatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
}
