"use client";

import { useEffect, useRef, useState } from "react";
import { ctr, num, pctText } from "@/lib/ads";

// Small dependency-free SVG charts for the Ads Manager.

function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const read = () => setW(Math.floor(el.getBoundingClientRect().width));
    read();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

const nice = (max) => {
  if (max <= 0) return 10;
  const p = 10 ** Math.floor(Math.log10(max));
  const f = max / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
};

// Views as bars (left axis) and CTR as a line (right axis), one point per day.
export function TrendChart({ days, height = 250 }) {
  const [wrap, width] = useWidth();
  const [active, setActive] = useState(null);
  const data = days.map((d) => ({ ...d, ctr: ctr(d.c, d.v) }));
  const compact = width < 460;
  const pad = { l: compact ? 34 : 44, r: compact ? 34 : 46, t: 14, b: 28 };
  const iw = Math.max(10, width - pad.l - pad.r);
  const ih = height - pad.t - pad.b;
  const maxV = nice(Math.max(1, ...data.map((d) => d.v)));
  const maxC = nice(Math.max(1, ...data.map((d) => d.ctr)));
  const step = iw / data.length;
  const bw = Math.max(3, Math.min(34, step * 0.62));
  const x = (i) => pad.l + step * i + step / 2;
  const yv = (v) => pad.t + ih - (v / maxV) * ih;
  const yc = (v) => pad.t + ih - (v / maxC) * ih;
  const every = Math.ceil(data.length / Math.max(2, Math.floor(iw / 62)));
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${yc(d.ctr).toFixed(1)}`).join(" ");
  const total = data.reduce((a, d) => ({ v: a.v + d.v, c: a.c + d.c }), { v: 0, c: 0 });
  const sel = active != null ? data[active] : null;
  const empty = total.v === 0 && total.c === 0;

  function pick(e) {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.floor(((e.clientX - r.left - pad.l) / iw) * data.length);
    setActive(Math.min(data.length - 1, Math.max(0, i)));
  }

  return (
    <div className="am-chart">
      <div className="am-chart-read" aria-live="polite">
        {sel ? (
          <><b>{sel.label}</b><span>{num(sel.v)} views</span><span>{num(sel.c)} clicks</span><span className="ctr">{pctText(sel.ctr)} CTR</span></>
        ) : (
          <><b>Last {data.length} days</b><span>{num(total.v)} views</span><span>{num(total.c)} clicks</span><span className="ctr">{pctText(ctr(total.c, total.v))} CTR</span></>
        )}
      </div>
      <div className="am-chart-box" ref={wrap}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label="Views and click-through rate by day" onPointerMove={pick} onPointerDown={pick} onPointerLeave={() => setActive(null)}>
            <defs>
              <linearGradient id="amBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2de2c5" /><stop offset="1" stopColor="#1b6fa8" /></linearGradient>
            </defs>
            {[0, 0.25, 0.5, 0.75, 1].map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={width - pad.r} y1={pad.t + ih * (1 - t)} y2={pad.t + ih * (1 - t)} className="am-grid" />
                <text x={pad.l - 6} y={pad.t + ih * (1 - t) + 3.5} textAnchor="end" className="am-axis">{num(maxV * t)}</text>
                <text x={width - pad.r + 6} y={pad.t + ih * (1 - t) + 3.5} className="am-axis c">{(maxC * t).toFixed(maxC < 5 ? 1 : 0)}%</text>
              </g>
            ))}
            {data.map((d, i) => (
              <rect key={d.key} x={x(i) - bw / 2} y={yv(d.v)} width={bw} height={Math.max(d.v ? 2 : 0, pad.t + ih - yv(d.v))} rx={Math.min(5, bw / 2)} fill="url(#amBar)" opacity={active == null || active === i ? 1 : 0.4} />
            ))}
            <path d={line} className="am-line" fill="none" />
            {data.map((d, i) => (d.v > 0 ? <circle key={d.key} cx={x(i)} cy={yc(d.ctr)} r={active === i ? 5 : 3} className="am-dot" /> : null))}
            {data.map((d, i) => (i % every === 0 ? <text key={d.key} x={x(i)} y={height - 8} textAnchor="middle" className="am-axis">{d.label}</text> : null))}
          </svg>
        )}
        {empty && <div className="am-chart-empty">No views yet. Numbers show up here as soon as your ad starts serving.</div>}
      </div>
      <div className="am-legend"><span><i className="bar" />Views</span><span><i className="ln" />CTR (clicks ÷ views)</span></div>
    </div>
  );
}

// Share of views per placement, with each one's CTR.
export function SourceBars({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.views));
  return (
    <ul className="am-src">
      {rows.map((r) => (
        <li key={r.id}>
          <div className="am-src-top"><b>{r.label}</b><span>{num(r.views)} views · {num(r.clicks)} clicks · <em>{pctText(ctr(r.clicks, r.views))}</em></span></div>
          <div className="am-src-bar"><i style={{ width: `${(r.views / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}
