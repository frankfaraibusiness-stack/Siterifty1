import Link from "next/link";
import { LockIcon } from "./icons";

// Small layout pieces shared by the settings panels.
export function Block({ title, hint, children, className = "" }) {
  return (
    <section className={`st-block ${className}`.trim()}>
      {title && <h3>{title}</h3>}
      {hint && <p className="st-hint">{hint}</p>}
      {children}
    </section>
  );
}

export function Notice({ tone = "info", children }) {
  return (
    <p className={`st-notice ${tone}`} role={tone === "bad" ? "alert" : "status"}>
      {children}
    </p>
  );
}

// A locked option's pitch: shown to free accounts under the option they can't use.
export function Upsell({ children }) {
  return (
    <p className="st-upsell">
      <LockIcon />
      <span>{children}</span>
      <Link href="/upgrade">See plans</Link>
    </p>
  );
}
