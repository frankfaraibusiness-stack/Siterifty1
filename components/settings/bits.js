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
