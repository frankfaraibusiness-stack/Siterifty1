// The Videos tab's scoring engine ("Vice Reel"). Pure functions only: no
// Firestore, no clock, no network. The server (lib/videos-data.js) feeds it the
// player's saved state, what it VERIFIED about each clip, and the time, and
// writes back whatever comes out. tests/videos-engine.test.mjs covers it.
//
// The browser never decides how much XP it earns. It reports what happened
// ("I finished this clip", "I found a package") and this module accepts or
// ignores each claim.
import {
  COMBO_MAX, DAILY_XP_CAP, EVENT_TYPES, MAX_ACTS, MAX_EVENTS, MIN_WATCH_SECONDS, STREAK_BONUS,
  STREAK_BONUS_MAX, STREAK_CLIPS, WATCH_FRACTION, XP, comboMultiplier, missionsFor, packageFor,
  prevDayKey, rankFor, POST_ID,
} from "./videos-config.js";

const MAX_CLIP_SECONDS = 180; // the upload limit (LIMITS.videoSeconds)
const CHAIN_SLACK_MS = 45_000; // how long after a clip ends the next one may finish and still chain
const WATCH_SLACK_MS = 4_000; // free play-time credit, so the very first claim isn't refused
const WATCH_HONESTY = 0.7; // you must have spent this much real time per second you claim
const CREDIT_CAP_MS = 10 * 60_000; // time spent away never banks more than this

const STAT_FOR_EVENT = { watch: "clips", like: "likes", comment: "comments", save: "saves", share: "shares", package: "packages" };
const XP_FOR_EVENT = XP;

// ------------------------------------------------------------------ state
export function emptyDay(day) {
  return { day, clips: 0, likes: 0, comments: 0, saves: 0, shares: 0, packages: 0, actionXp: 0, done: [], acts: [], streakCounted: false };
}

export function emptyPlayer() {
  return {
    xp: 0,
    streak: 0,
    bestStreak: 0,
    streakDay: null, // the last day the streak was earned
    clipsTotal: 0,
    packagesTotal: 0,
    chain: 0, // clips finished back to back
    chainAt: 0, // when the last one finished (ms)
    watchAt: 0, // when the last watch claim was accepted (ms)
    today: emptyDay(null),
  };
}

const num = (v, max = 1e9) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));

// Whatever came out of storage, made safe and rolled onto `day`.
export function normalizePlayer(raw, day) {
  const p = emptyPlayer();
  const r = raw && typeof raw === "object" ? raw : {};
  p.xp = num(r.xp);
  p.streak = num(r.streak, 100000);
  p.bestStreak = Math.max(p.streak, num(r.bestStreak, 100000));
  p.streakDay = typeof r.streakDay === "string" ? r.streakDay : null;
  p.clipsTotal = num(r.clipsTotal);
  p.packagesTotal = num(r.packagesTotal);
  p.chain = num(r.chain, 100000);
  p.chainAt = num(r.chainAt, 1e15);
  p.watchAt = num(r.watchAt, 1e15);
  const t = r.today && typeof r.today === "object" ? r.today : null;
  if (t && t.day === day) {
    p.today = {
      ...emptyDay(day),
      clips: num(t.clips), likes: num(t.likes), comments: num(t.comments), saves: num(t.saves),
      shares: num(t.shares), packages: num(t.packages), actionXp: num(t.actionXp),
      done: Array.isArray(t.done) ? t.done.filter((s) => typeof s === "string").slice(0, 8) : [],
      acts: Array.isArray(t.acts) ? t.acts.filter((s) => typeof s === "string").slice(0, MAX_ACTS) : [],
      streakCounted: t.streakCounted === true,
    };
  } else {
    p.today = emptyDay(day);
  }
  return p;
}

// A streak that is already lost (not earned yesterday or today) reads as 0.
export function liveStreak(p, day) {
  if (!p.streak) return 0;
  return p.streakDay === day || p.streakDay === prevDayKey(day) ? p.streak : 0;
}

// What the browser is allowed to know about a player.
export function viewOf(player, day) {
  const p = normalizePlayer(player, day);
  const t = p.today;
  const missions = missionsFor(day).map((m) => ({
    id: m.id, title: m.title, text: m.text, goal: m.goal, xp: m.xp,
    progress: Math.min(m.goal, t[m.stat] || 0),
    done: t.done.includes(m.id),
  }));
  return {
    xp: p.xp,
    rank: rankFor(p.xp),
    streak: liveStreak(p, day),
    bestStreak: p.bestStreak,
    streakSafe: t.streakCounted,
    streakClips: Math.min(STREAK_CLIPS, t.clips),
    streakGoal: STREAK_CLIPS,
    clipsTotal: p.clipsTotal,
    packagesTotal: p.packagesTotal,
    combo: p.chain,
    today: { day, clips: t.clips, likes: t.likes, comments: t.comments, saves: t.saves, shares: t.shares, packages: t.packages, xp: t.actionXp, cap: DAILY_XP_CAP },
    missions,
    found: t.acts.filter((a) => a.startsWith("package:")).map((a) => a.slice(8)),
  };
}

// ------------------------------------------------------------------ claims
export function cleanEvents(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const e of list.slice(0, MAX_EVENTS)) {
    if (!e || typeof e !== "object") continue;
    const type = String(e.type || "");
    if (type !== "skip" && !EVENT_TYPES.includes(type)) continue;
    if (type === "skip") {
      out.push({ type });
      continue;
    }
    const postId = String(e.postId || "");
    if (!POST_ID.test(postId)) continue;
    out.push({
      type,
      postId,
      seconds: Math.max(0, Math.min(MAX_CLIP_SECONDS * 2, Number(e.seconds) || 0)),
      duration: Math.max(0, Math.min(MAX_CLIP_SECONDS, Number(e.duration) || 0)),
    });
  }
  return out;
}

// Applies a batch of claims. `facts(postId)` is what the server verified about
// a clip: { own, liked, saved, commented, duration }. Missing facts = no XP.
// Never mutates its input. Returns { player, awards, missionsDone, streak, rankUp }.
export function applyEvents(player, events, { day, nowMs, facts }) {
  const p = normalizePlayer(player, day);
  const t = p.today;
  const before = rankFor(p.xp).level;
  const awards = [];
  const missionsDone = [];
  let streakHit = null;

  // Real time that has passed since the last accepted watch is the budget for
  // how many seconds of video can honestly have been played since.
  let credit = Math.min(CREDIT_CAP_MS, Math.max(0, nowMs - (p.watchAt || nowMs - CREDIT_CAP_MS))) + WATCH_SLACK_MS;

  const room = () => Math.max(0, DAILY_XP_CAP - t.actionXp);
  const paid = (key) => t.acts.includes(key);
  const remember = (key) => {
    t.acts.push(key);
    if (t.acts.length > MAX_ACTS) t.acts.shift();
  };

  for (const e of cleanEvents(events)) {
    if (e.type === "skip") {
      p.chain = 0; // swiped away before it counted: the combo breaks
      continue;
    }
    const f = facts(e.postId);
    if (!f || f.own) continue; // unknown clip, or your own: no XP
    const key = `${e.type}:${e.postId}`;
    if (paid(key)) continue; // each action on a clip pays once a day

    let ok = false;
    let mult = 1;
    if (e.type === "watch") {
      const duration = f.duration > 0 ? f.duration : e.duration;
      const need = Math.max(MIN_WATCH_SECONDS, WATCH_FRACTION * Math.max(1, Math.min(MAX_CLIP_SECONDS, duration || MIN_WATCH_SECONDS)));
      const cost = e.seconds * 1000 * WATCH_HONESTY;
      if (e.seconds >= need - 0.25 && cost <= credit) {
        ok = true;
        credit -= cost;
        // The chain survives while clips keep being finished, one after another.
        const gap = nowMs - p.chainAt;
        const chained = p.chain > 0 && p.chainAt > 0 && gap <= (Math.max(duration, 1) * 1000) + CHAIN_SLACK_MS + e.seconds * 1000;
        if (!chained) p.chain = 0;
        mult = comboMultiplier(p.chain);
        p.chain += 1;
        p.chainAt = nowMs;
        p.watchAt = nowMs;
        p.clipsTotal += 1;
      }
    } else if (e.type === "like") ok = f.liked === true;
    else if (e.type === "save") ok = f.saved === true;
    else if (e.type === "comment") ok = f.commented === true;
    else if (e.type === "share") ok = true; // can't be seen from here: capped by once-a-clip and the daily cap
    else if (e.type === "package") ok = !!packageFor(e.postId, day);

    if (!ok) continue;
    remember(key);
    t[STAT_FOR_EVENT[e.type]] += 1;
    const base = XP_FOR_EVENT[e.type];
    const gain = Math.min(base * mult, room());
    t.actionXp += gain;
    p.xp += gain;
    if (e.type === "package") p.packagesTotal += 1;
    awards.push({ type: e.type, postId: e.postId, xp: gain, base, mult, capped: gain < base * mult });
  }

  // Missions pay on top of the daily cap.
  for (const m of missionsFor(day)) {
    if (!t.done.includes(m.id) && (t[m.stat] || 0) >= m.goal) {
      t.done.push(m.id);
      p.xp += m.xp;
      missionsDone.push({ id: m.id, title: m.title, xp: m.xp });
    }
  }

  // Finish STREAK_CLIPS clips in a day and the streak ticks up.
  if (!t.streakCounted && t.clips >= STREAK_CLIPS) {
    t.streakCounted = true;
    p.streak = p.streakDay === prevDayKey(day) ? p.streak + 1 : p.streakDay === day ? Math.max(1, p.streak) : 1;
    p.streakDay = day;
    p.bestStreak = Math.max(p.bestStreak, p.streak);
    const bonus = Math.min(STREAK_BONUS_MAX, STREAK_BONUS * p.streak);
    p.xp += bonus;
    streakHit = { days: p.streak, xp: bonus };
  }

  const after = rankFor(p.xp);
  return {
    player: p,
    awards,
    missionsDone,
    streak: streakHit,
    rankUp: after.level > before ? { level: after.level, name: after.name } : null,
  };
}

export { COMBO_MAX };
