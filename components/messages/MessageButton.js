"use client";

import Link from "next/link";
import { Icon } from "./ui";
import { messagingVerdict, verdictReason } from "@/lib/chat-config";

// The "Message" button on someone else's profile. It sits next to the site's
// own Follow / Add friend buttons (components/SocialActions.js) and reads their
// live state, so it unlocks the moment you follow or befriend someone.
//
// info = { setting, replyRight, blockedCode } comes from the server
// (getMessagingInfo in lib/chat-social.js); `following` and `friend` are the
// live values from useSocial().
export default function MessageButton({ username, info, following, friend, flash }) {
  const verdict = info.blockedCode
    ? { ok: false, code: info.blockedCode }
    : messagingVerdict({
        setting: info.setting,
        isFriend: friend === "friends",
        senderFollowsTarget: following,
        replyRight: info.replyRight,
      });

  if (verdict.ok) {
    return (
      <Link href={`/messages?with=${encodeURIComponent(username)}`} className="pf-btn pf-btn-ghost pf-btn-msg">
        <span className="pf-ico"><Icon.Send size={16} /></span>
        Message
      </Link>
    );
  }
  return (
    <button
      type="button"
      className="pf-btn pf-btn-ghost pf-btn-locked"
      aria-disabled="true"
      title={verdictReason(verdict.code, username)}
      onClick={() => flash(verdictReason(verdict.code, username))}
    >
      <span className="pf-ico"><Icon.Lock size={16} /></span>
      Message
    </button>
  );
}
