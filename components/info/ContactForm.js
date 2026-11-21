"use client";

import { useState } from "react";
import InfoIcon from "./icons";
import Select from "@/components/ui/Select";

const MAX = 4000;

// The form on /contact. Posts to /api/contact, which saves the message for
// the team to read. A hidden "company" field catches simple bots.
export default function ContactForm({ topics, initialTopic, defaults }) {
  const [topic, setTopic] = useState(initialTopic);
  const [name, setName] = useState("");
  const [email, setEmail] = useState(defaults.email || "");
  const [username, setUsername] = useState(defaults.username || "");
  const [link, setLink] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [state, setState] = useState("idle"); // idle | sending | done
  const [error, setError] = useState("");
  const [ref, setRef] = useState("");

  const current = topics.find((t) => t.id === topic) || topics[0];

  async function submit(e) {
    e.preventDefault();
    if (state === "sending") return;
    setError("");
    setState("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, name, email, username, link, message, company }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "We couldn’t send that. Please try again.");
      setRef(data.id || "");
      setState("done");
    } catch (err) {
      setError(err.message || "We couldn’t send that. Please try again.");
      setState("idle");
    }
  }

  function again() {
    setMessage("");
    setLink("");
    setRef("");
    setState("idle");
  }

  if (state === "done") {
    return (
      <div className="ip-sent" role="status">
        <span className="ip-sent-ic">
          <InfoIcon name="check" />
        </span>
        <h3>Message sent</h3>
        <p>
          Thanks, we got it. We will reply to <b>{email}</b>. Keep an eye on your spam folder too.
        </p>
        {ref && (
          <p className="ip-sent-ref">
            Your reference: <code>{ref}</code>
          </p>
        )}
        <button type="button" className="ip-btn ghost" onClick={again}>
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form className="ip-form" onSubmit={submit} noValidate>
      <div className="ip-field">
        <label htmlFor="c-topic">What is this about?</label>
        <Select id="c-topic" label="What is this about?" value={topic} onChange={setTopic} options={topics.map((t) => ({ value: t.id, label: t.label }))} />
        <small>{current.hint}</small>
      </div>

      <div className="ip-row">
        <div className="ip-field">
          <label htmlFor="c-name">Your name</label>
          <input id="c-name" type="text" autoComplete="name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="ip-field">
          <label htmlFor="c-email">Your email</label>
          <input id="c-email" type="email" autoComplete="email" maxLength={160} value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
      </div>

      <div className="ip-row">
        <div className="ip-field">
          <label htmlFor="c-user">
            Your GTAFanbase username <em>(optional)</em>
          </label>
          <input id="c-user" type="text" autoComplete="username" maxLength={40} value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="ip-field">
          <label htmlFor="c-link">
            Link to the post, profile or page <em>(optional)</em>
          </label>
          <input id="c-link" type="text" inputMode="url" maxLength={500} placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} />
        </div>
      </div>

      <div className="ip-field">
        <label htmlFor="c-msg">Your message</label>
        <textarea id="c-msg" rows={7} maxLength={MAX} value={message} onChange={(e) => setMessage(e.target.value)} required />
        <small className="ip-counter">
          {message.length.toLocaleString()} / {MAX.toLocaleString()}
        </small>
      </div>

      <div className="ip-hp" aria-hidden="true">
        <label htmlFor="c-company">Leave this field empty</label>
        <input id="c-company" type="text" tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} />
      </div>

      {error && (
        <p className="ip-form-err" role="alert">
          <InfoIcon name="alert" />
          {error}
        </p>
      )}

      <button type="submit" className="ip-btn" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Send message"}
      </button>
      <p className="ip-form-note">
        We use your details only to answer this message. See the <a href="/privacy">Privacy Policy</a>.
      </p>
    </form>
  );
}
