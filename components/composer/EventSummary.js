"use client";

import TypeIcon from "./TypeIcon";
import { EVENT_JOIN, EVENT_PRIVACY, TYPES } from "@/lib/post-schema";

function fmtWhen(ev) {
  const start = Date.parse(ev.startsAt || "");
  if (Number.isNaN(start)) return "";
  const day = new Date(start).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  const clock = (ms) => new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const end = Date.parse(ev.endsAt || "");
  const sameDay = !Number.isNaN(end) && new Date(end).toDateString() === new Date(start).toDateString();
  return `${day} · ${clock(start)}${Number.isNaN(end) ? "" : sameDay ? ` to ${clock(end)}` : ` to ${clock(end)} (next day)`}`;
}

// A plain recap of what the host has set up. This is the creation recap, not
// the feed card (that comes later), so it shows every field the host filled in.
export default function EventSummary({ d, user }) {
  const ev = d.event;
  const t = TYPES.event;
  const when = fmtWhen(ev);
  const join = EVENT_JOIN.find((j) => j.value === ev.join)?.label;
  const privacy = EVENT_PRIVACY.find((p) => p.value === ev.privacy)?.label;

  const where =
    ev.mode === "irl"
      ? [ev.venue, ev.address].filter(Boolean).join(" · ")
      : ev.mode === "online"
      ? "Online"
      : d.location;
  const rows = [
    ["When", when || "Date and time not set"],
    ["Where", where || "Not set"],
    ev.spot && [ev.mode === "online" ? "Room" : "Meet at", ev.spot],
    ev.platforms.length > 0 && ["Platforms", ev.platforms.join(", ")],
    ev.link && ["Link", ev.link],
    ["Open to", join || "Not set"],
    ["Visibility", privacy || "Not set"],
    ev.capacity && ["Spots", String(ev.capacity)],
    ev.bring && ["Bring", ev.bring],
    ev.rules && ["Rules", ev.rules],
  ].filter(Boolean);

  const flags = [
    ev.mode === "irl" && ev.hideSpot && "Pin hidden until RSVP",
    ev.waitlist && ev.capacity && "Waitlist",
    ev.approval && "Host approves RSVPs",
    ev.plusOnes && "+1 allowed",
    ev.showGuests ? "Guest list shown" : "Guest list hidden",
  ].filter(Boolean);

  return (
    <article className="ev-sum" style={{ "--a": t.a, "--b": t.b }}>
      {d.images[0] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="ev-sum-cover" src={d.images[0].data} alt={d.images[0].alt || ""} />
      ) : (
        <div className="ev-sum-art" aria-hidden="true"><TypeIcon type="event" size={34} /></div>
      )}
      <div className="ev-sum-body">
        <span className="ev-sum-cat">{ev.category}</span>
        <h3>{d.title || "Your event name"}</h3>
        <p className="ev-sum-host">Hosted by {user.username}</p>
        {d.text && <p className="ev-sum-about">{d.text}</p>}
        <dl className="ev-sum-rows">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <ul className="ev-sum-flags">
          {flags.map((f) => <li key={f}>{f}</li>)}
          {d.tags.map((x) => <li key={x}>#{x}</li>)}
        </ul>
      </div>
    </article>
  );
}
