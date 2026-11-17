import Link from "next/link";
import InfoIcon from "./icons";
import { renderRich, plainText } from "./rich";

// Building blocks for the public info pages. All server-safe (no hooks).

// A titled section with an anchor id (the rail's "On this page" links to it).
// `num` adds a citable clause number, used on the legal documents.
export function Sec({ id, title, num, lead, children }) {
  return (
    <section id={id} className="ip-sec" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="ip-h2">
        {num != null && <span className="ip-num">{num}</span>}
        <span>{title}</span>
      </h2>
      {lead && <p className="ip-lead">{renderRich(lead)}</p>}
      {children}
    </section>
  );
}

export function P({ children }) {
  return <p className="ip-p">{typeof children === "string" ? renderRich(children) : children}</p>;
}

export function Bullets({ items }) {
  return (
    <ul className="ip-bullets">
      {items.map((t, i) => (
        <li key={i}>{renderRich(t)}</li>
      ))}
    </ul>
  );
}

// tone: key (pink), note (cyan), warn (gold), ok (lime)
export function Callout({ tone = "note", icon, title, children }) {
  const defaultIcon = { key: "info", note: "info", warn: "alert", ok: "check" }[tone];
  return (
    <aside className={`ip-callout ip-${tone}`}>
      <span className="ip-callout-ic">
        <InfoIcon name={icon || defaultIcon} />
      </span>
      <div>
        {title && <b className="ip-callout-t">{title}</b>}
        <div className="ip-callout-b">{typeof children === "string" ? renderRich(children) : children}</div>
      </div>
    </aside>
  );
}

// Big-number / short-label tiles. `big` can be a word, e.g. "13+" or "Free".
export function Facts({ items }) {
  return (
    <ul className="ip-facts">
      {items.map((f) => (
        <li key={f.label} className="ip-fact">
          {f.icon && (
            <span className="ip-fact-ic">
              <InfoIcon name={f.icon} />
            </span>
          )}
          <b>{f.big}</b>
          <span>{f.label}</span>
        </li>
      ))}
    </ul>
  );
}

// Icon cards. Optional `tone` gives a card its own colour:
// pink | cyan | lime | gold | violet | orange
export function Cards({ items, min = 240 }) {
  return (
    <div className="ip-cards" style={{ "--ip-min": `${min}px` }}>
      {items.map((c) => (
        <article key={c.title} className={`ip-card${c.tone ? ` ip-t-${c.tone}` : ""}`}>
          <span className="ip-card-ic">
            <InfoIcon name={c.icon || "star"} />
          </span>
          <h3>{c.title}</h3>
          <p>{renderRich(c.text)}</p>
        </article>
      ))}
    </div>
  );
}

// A real sequence (numbered on purpose).
export function Steps({ items }) {
  return (
    <ol className="ip-steps">
      {items.map((s) => (
        <li key={s.title}>
          <b>{s.title}</b>
          <p>{renderRich(s.text)}</p>
        </li>
      ))}
    </ol>
  );
}

export function DoDont({ yes, no }) {
  return (
    <div className="ip-dd">
      <div className="ip-dd-col ip-dd-yes">
        <h3>
          <InfoIcon name="check" />
          {yes.title}
        </h3>
        <ul>
          {yes.items.map((t) => (
            <li key={t}>{renderRich(t)}</li>
          ))}
        </ul>
      </div>
      <div className="ip-dd-col ip-dd-no">
        <h3>
          <InfoIcon name="x" />
          {no.title}
        </h3>
        <ul>
          {no.items.map((t) => (
            <li key={t}>{renderRich(t)}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Responsive table: scrolls sideways inside its own box on phones.
export function DataTable({ caption, head, rows }) {
  return (
    <div className="ip-table-wrap" tabIndex={0} role="region" aria-label={caption}>
      <table className="ip-table">
        <caption className="ip-sr">{caption}</caption>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) =>
                j === 0 ? (
                  <th key={j} scope="row">
                    {renderRich(cell)}
                  </th>
                ) : (
                  <td key={j}>{renderRich(cell)}</td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Question and answer dropdowns. Native <details>, so they work with no
// JavaScript and search engines read the answers straight from the HTML.
export function Faq({ items, title = "Questions and answers", id = "faq" }) {
  return (
    <Sec id={id} title={title}>
      <div className="ip-faq">
        {items.map((it) => (
          <details key={it.q} className="ip-q">
            <summary>
              <span>{it.q}</span>
              <span className="ip-q-plus" aria-hidden="true" />
            </summary>
            <div className="ip-q-a">
              {(Array.isArray(it.a) ? it.a : [it.a]).map((para, i) => (
                <p key={i}>{renderRich(para)}</p>
              ))}
            </div>
          </details>
        ))}
      </div>
    </Sec>
  );
}

// Structured data for search engines.
export function JsonLd({ data }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

export function faqLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: plainText(it.q),
      acceptedAnswer: {
        "@type": "Answer",
        text: (Array.isArray(it.a) ? it.a : [it.a]).map(plainText).join(" "),
      },
    })),
  };
}

// Pill links to other pages: used at the bottom of a page.
export function PageLinks({ pages }) {
  return (
    <div className="ip-links">
      {pages.map((p) => (
        <Link
          key={p.key}
          href={p.href}
          prefetch={false}
          className="ip-link"
          style={{ "--pa": p.a, "--pb": p.b }}
        >
          <span className="ip-link-ic">
            <InfoIcon name={p.icon} />
          </span>
          <span className="ip-link-t">
            <b>{p.title}</b>
            <small>{p.blurb}</small>
          </span>
          <InfoIcon name="chevron" className="ip-link-chev" />
        </Link>
      ))}
    </div>
  );
}
