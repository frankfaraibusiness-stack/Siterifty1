import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { mergeSection, normalizePrefs } from "@/lib/settings";

// users/{uid}.prefs = { account, content, safety, feed, look } (see lib/settings.js).
// Accounts with no prefs field read as the defaults.
export async function getPrefs(uid) {
  if (!uid) return normalizePrefs(null);
  const snap = await getAdminDb().collection("users").doc(uid).get();
  return normalizePrefs(snap.exists ? snap.data().prefs : null);
}

// Saves a partial change to one section and returns the cleaned section.
export async function savePrefsSection(uid, section, patch) {
  const ref = getAdminDb().collection("users").doc(uid);
  const current = normalizePrefs((await ref.get()).data()?.prefs);
  const next = mergeSection(current, section, patch);
  await ref.set(
    { prefs: { [section]: next }, prefsUpdatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
  return next;
}

export async function setBlockedList(uid, blocked) {
  return savePrefsSection(uid, "safety", { blocked });
}

// Counts for the Stash panel: how many posts are live, private or scheduled.
export async function getContentStats(uid) {
  const snap = await getAdminDb()
    .collection("posts")
    .where("uid", "==", uid)
    .select("settings.visibility", "createdAt")
    .limit(1000)
    .get();
  const now = Date.now();
  const stats = { total: 0, everyone: 0, onlyMe: 0, scheduled: 0 };
  for (const doc of snap.docs) {
    const d = doc.data();
    stats.total += 1;
    if (d.settings?.visibility === "private") stats.onlyMe += 1;
    else stats.everyone += 1;
    if ((d.createdAt?.toMillis?.() ?? 0) > now) stats.scheduled += 1;
  }
  return stats;
}
