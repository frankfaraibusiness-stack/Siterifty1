// Who may see the small things a member shows on their profile picture and name: the country flag and the
// male/female icon. Same five choices for both, public by default.
//
//   public            anyone who can open the profile
//   friendsfollowers  accepted friends, or people who follow the member
//   friends           accepted friends only
//   followers         people who follow the member only
//   nobody            no one else (paid plans only)
//
// Pure (no imports, no I/O) so the settings, the profile page, the API route and the tests share one rule.

export const INFO_AUDIENCES = [
  { id: "public", label: "Public", hint: "Anyone who can open your profile." },
  { id: "friendsfollowers", label: "Friends & followers", hint: "Your friends and people who follow you." },
  { id: "friends", label: "Friends only", hint: "Only people you’ve accepted as friends." },
  { id: "followers", label: "Followers only", hint: "Only people who follow you." },
  { id: "nobody", label: "No one", hint: "Hidden from everyone else. Only you can see it." },
];
export const INFO_AUDIENCE_IDS = INFO_AUDIENCES.map((a) => a.id);
export const DEFAULT_INFO_AUDIENCE = "public";
// The one choice that needs a paid plan.
export const LOCKED_INFO_AUDIENCE = "nobody";
// The two fields on prefs.account that hold a choice.
export const INFO_FIELDS = ["genderAudience", "countryAudience"];

export const INFO_GATE_MESSAGE = "Hiding your gender or country from everyone (“No one”) comes with any paid plan.";

export function isInfoAudience(v) {
  return typeof v === "string" && INFO_AUDIENCE_IDS.includes(v);
}

// Accounts saved before this had a single "Show my gender" switch: off meant hidden from everyone, so it stays
// that way ("nobody"). Anything else, or nothing saved, is public.
export function genderAudienceOf(account) {
  const a = account && typeof account === "object" ? account : {};
  if (isInfoAudience(a.genderAudience)) return a.genderAudience;
  return a.showGender === false ? "nobody" : DEFAULT_INFO_AUDIENCE;
}

export function countryAudienceOf(account) {
  const a = account && typeof account === "object" ? account : {};
  return isInfoAudience(a.countryAudience) ? a.countryAudience : DEFAULT_INFO_AUDIENCE;
}

// Does this audience need to know how the viewer is connected to the member?
export function needsRelationship(audience) {
  return audience === "friendsfollowers" || audience === "friends" || audience === "followers";
}

// isFriend: the viewer and the member are accepted friends. followsOwner: the viewer follows the member.
// The member always sees their own, except when they chose "nobody" (so the setting does what it says).
export function canSeeInfo({ audience, isOwner = false, isFriend = false, followsOwner = false }) {
  if (isOwner) return audience !== "nobody";
  switch (audience) {
    case "public":
      return true;
    case "friendsfollowers":
      return isFriend || followsOwner;
    case "friends":
      return isFriend;
    case "followers":
      return followsOwner;
    default:
      return false;
  }
}

// Which fields a patch would newly switch to "nobody". A free account that already has it (set before it was a
// paid option, or while on a paid plan) keeps it; only a change *to* the locked value counts.
export function lockedInfoChanges(current, patch) {
  const cur = current && typeof current === "object" ? current : {};
  const next = patch && typeof patch === "object" ? patch : {};
  return INFO_FIELDS.filter((f) => next[f] === LOCKED_INFO_AUDIENCE && cur[f] !== LOCKED_INFO_AUDIENCE);
}

// -> { ok: true } or { ok: false, error, locked: [...] }. `paid` = any paid plan.
export function checkProfilePrivacy({ paid, current, patch }) {
  if (paid) return { ok: true };
  const locked = lockedInfoChanges(current, patch);
  if (locked.length === 0) return { ok: true };
  return { ok: false, error: INFO_GATE_MESSAGE, locked };
}

// Cleans the account patch the browser sent: an old page's "Show my gender" switch becomes the matching choice,
// and an unknown audience is dropped (so a bad value can never widen who sees something).
export function cleanInfoPatch(patch) {
  const out = { ...(patch && typeof patch === "object" ? patch : {}) };
  if (typeof out.showGender === "boolean") {
    if (!isInfoAudience(out.genderAudience)) out.genderAudience = out.showGender ? DEFAULT_INFO_AUDIENCE : LOCKED_INFO_AUDIENCE;
  }
  delete out.showGender;
  for (const f of INFO_FIELDS) if (f in out && !isInfoAudience(out[f])) delete out[f];
  return out;
}
