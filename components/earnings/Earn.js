import Link from "next/link";
import { dayKeyToLabel, num } from "@/lib/ads";
import { moneyText } from "@/lib/instream-ads";

// Small server-rendered pieces shared by /earnings and the owner's strip on a video's page. No client code.

export function Bars({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.micros));
  return (
    <ol className="ern-bars" aria-label="Earnings over the last 7 days">
      {rows.map((r) => (
        <li key={r.key} title={`${dayKeyToLabel(r.key)}: ${moneyText(r.micros)} from ${num(r.views)} ad views`}>
          <i style={{ height: `${Math.max(r.micros ? 8 : 3, (r.micros / max) * 100)}%` }} className={r.micros ? "on" : ""} />
          <span>{dayKeyToLabel(r.key).split(" ")[1] || ""}</span>
        </li>
      ))}
    </ol>
  );
}

// "$12.34 from 5,200 ad views (3,000 video, 2,200 photo)"
export const viewsLine = (e) => `${num(e.views)} ad views · ${num(e.videoViews)} video, ${num(e.imageViews)} photo`;

export function VideoStrip({ e }) {
  const week = e.last7.reduce((s, r) => s + r.micros, 0);
  return (
    <section className="ern-strip" aria-label="Ad earnings on this video">
      <div className="ern-strip-head">
        <span className="ern-tag">Ad earnings</span>
        <Link href="/earnings" className="ern-link">All earnings →</Link>
      </div>
      <div className="ern-strip-body">
        <div>
          <b className="ern-big">{moneyText(e.micros)}</b>
          <small>{viewsLine(e)}</small>
          <small>{moneyText(week)} in the last 7 days</small>
        </div>
        <Bars rows={e.last7} />
      </div>
    </section>
  );
}
