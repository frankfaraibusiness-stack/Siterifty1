"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { Field, RadioCards, Segmented, TagPicker, TextInput, Toggle } from "./ui";
import { ImageUploader } from "./MediaUploader";
import LocationPicker from "./LocationPicker";
import PinPicker from "./PinPicker";
import {
  EVENT_CATEGORIES,
  EVENT_JOIN,
  EVENT_MODES,
  EVENT_PRIVACY,
  LIMITS,
  eventEndsNextDay,
  eventPlatformsFor,
  withEventTimes,
} from "@/lib/post-schema";
import { PLANS, canHostPaidEvents, getPlan, PAID_EVENT_PLAN } from "@/lib/plans";
import { TICKETS_FREE_WHILE_TESTING } from "@/lib/event-rules";

const pad = (n) => String(n).padStart(2, "0");
const toDateInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "";

function Card({ title, sub, children }) {
  return (
    <section className="cmp-card ev-card">
      <header className="ev-card-h">
        <h3>{title}</h3>
        {sub && <p>{sub}</p>}
      </header>
      {children}
    </section>
  );
}

function Chips({ label, options, value, onChange, multi, error, hint }) {
  const has = (o) => (multi ? value.includes(o) : value === o);
  const toggle = (o) => {
    if (!multi) return onChange(o);
    onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  };
  return (
    <Field label={label} error={error} hint={hint}>
      <div className="cmp-chips ev-chips" role={multi ? "group" : "radiogroup"} aria-label={label}>
        {options.map((o) => (
          <button
            key={o}
            type="button"
            className={`cmp-chip${has(o) ? " on" : ""}`}
            role={multi ? undefined : "radio"}
            aria-checked={multi ? undefined : has(o)}
            aria-pressed={multi ? has(o) : undefined}
            onClick={() => toggle(o)}
          >
            {o}
          </button>
        ))}
      </div>
    </Field>
  );
}

export default function EventForm({ d, set, e, plan }) {
  const ev = d.event;
  const uid = useId();
  const [today, setToday] = useState("");
  const [zone, setZone] = useState("");
  useEffect(() => {
    setToday(toDateInput(new Date()));
    setZone(browserZone());
  }, []);

  const put = (patch) => set({ event: { ...ev, ...patch } });
  // Anything that changes the clock also refreshes the absolute start/end the
  // server uses, in this browser's time zone.
  const putTime = (patch) => set({ event: withEventTimes({ ...ev, ...patch, tz: browserZone() }) });

  function quickDate(offsetDays, weekend) {
    const t = new Date();
    if (weekend) offsetDays = (6 - t.getDay() + 7) % 7 || 7;
    t.setDate(t.getDate() + offsetDays);
    putTime({ date: toDateInput(t) });
  }

  function setMode(mode) {
    put({ mode, platforms: ev.platforms.filter((p) => eventPlatformsFor(mode).includes(p)) });
  }

  const canCharge = canHostPaidEvents(plan);
  const paidPlan = getPlan(PAID_EVENT_PLAN)?.name || PLANS[PLANS.length - 1].name;

  // A saved draft can still say "paid" after a downgrade: clear it, since this
  // plan can't charge.
  useEffect(() => {
    if (!canCharge && ev.paid) set({ event: { ...ev, paid: false, price: "" } });
  }, [canCharge, ev, set]);

  const nextDay = eventEndsNextDay(ev);
  const mode = ev.mode;
  const modeHint = EVENT_MODES.find((m) => m.value === mode)?.hint;

  return (
    <>
      <Card title="The basics" sub="What it’s called and what it’s about.">
        <TextInput label="Event name" value={d.title} max={LIMITS.title} error={e.title} placeholder="Vice City sunset cruise" onChange={(title) => set({ title })} />
        <Chips label="What kind of event?" options={EVENT_CATEGORIES} value={ev.category} onChange={(category) => put({ category })} error={e.category} />
        <TextInput
          label="About the event"
          multiline
          rows={6}
          value={d.text}
          max={LIMITS.eventText}
          error={e.text}
          placeholder="What’s the plan? Who is it for? What should people expect?"
          onChange={(text) => set({ text })}
        />
        <ImageUploader label="Cover image (optional)" optional images={d.images} onChange={(images) => set({ images })} max={1} />
      </Card>

      <Card title="When" sub={zone ? `Times are in your time zone (${zone}).` : "Pick the day and start time."}>
        <div className="ev-grid">
          <Field label="Date" error={e.date} htmlFor={`${uid}-date`}>
            <input
              id={`${uid}-date`}
              type="date"
              className="cmp-input"
              min={today || undefined}
              value={ev.date}
              aria-invalid={!!e.date}
              onChange={(x) => putTime({ date: x.target.value })}
            />
          </Field>
          <Field label="Starts" error={e.time} htmlFor={`${uid}-time`}>
            <input
              id={`${uid}-time`}
              type="time"
              className="cmp-input"
              value={ev.time}
              aria-invalid={!!e.time}
              onChange={(x) => putTime({ time: x.target.value })}
            />
          </Field>
        </div>
        <div className="cmp-chips ev-quick" aria-label="Quick dates">
          <button type="button" className="cmp-chip" onClick={() => quickDate(1)}>Tomorrow</button>
          <button type="button" className="cmp-chip" onClick={() => quickDate(0, true)}>This weekend</button>
          <button type="button" className="cmp-chip" onClick={() => quickDate(7)}>Next week</button>
        </div>
        <div className="ev-end">
          <Field
            label="Ends (optional)"
            error={e.endTime}
            hint={nextDay ? "That’s earlier than the start, so it ends the next day." : "Leave empty if there’s no set end."}
            htmlFor={`${uid}-end`}
          >
            <div className="ev-end-row">
              <input
                id={`${uid}-end`}
                type="time"
                className="cmp-input"
                value={ev.endTime}
                aria-invalid={!!e.endTime}
                onChange={(x) => putTime({ endTime: x.target.value })}
              />
              {ev.endTime && (
                <button type="button" className="cmp-mini" onClick={() => putTime({ endTime: "" })}>Clear</button>
              )}
            </div>
          </Field>
        </div>
      </Card>

      <Card title="Where" sub="Show people exactly where to meet.">
        <Segmented
          label="Where is it happening?"
          value={mode}
          onChange={setMode}
          options={EVENT_MODES.map((m) => ({ value: m.value, label: m.label }))}
        />
        {modeHint && <p className="cmp-hint ev-mode-hint">{modeHint}</p>}

        {mode === "ingame" && (
          <>
            <Field label="Where in the world" error={e.location}>
              <LocationPicker value={d.location} onChange={(location) => set({ location })} error={e.location} />
            </Field>
            <Chips label="Platforms" multi options={eventPlatformsFor("ingame")} value={ev.platforms} onChange={(platforms) => put({ platforms })} error={e.platforms} hint="Which platforms can join?" />
            <TextInput label="Meeting spot" value={ev.spot} max={LIMITS.spot} error={e.spot} placeholder="Vice Beach pier, by the neon sign" onChange={(spot) => put({ spot })} />
            <TextInput label="Lobby or voice link (optional)" value={ev.link} max={LIMITS.link} error={e.link} placeholder="https://discord.gg/..." onChange={(link) => put({ link })} />
          </>
        )}

        {mode === "irl" && (
          <>
            <PinPicker pin={ev.pin} error={e.pin} onChange={(pin) => put({ pin, address: ev.address || (pin?.label ? pin.label.slice(0, LIMITS.address) : "") })} />
            <TextInput label="Place name" value={ev.venue} max={LIMITS.venue} error={e.venue} placeholder="Ocean Drive Cafe" onChange={(venue) => put({ venue })} />
            <TextInput label="Address (optional)" value={ev.address} max={LIMITS.address} error={e.address} placeholder="Street, city" onChange={(address) => put({ address })} />
            <TextInput label="Meeting spot" value={ev.spot} max={LIMITS.spot} error={e.spot} placeholder="By the main entrance, look for the pink flag" onChange={(spot) => put({ spot })} />
            <div className="ev-rows">
              <Toggle
                label="Hide the pin until people RSVP"
                hint="The exact spot is only shown to people who are going"
                checked={ev.hideSpot}
                onChange={(hideSpot) => put({ hideSpot })}
              />
            </div>
            <p className="cmp-note">Meeting people from the internet? Pick a busy public place and tell someone where you’ll be.</p>
          </>
        )}

        {mode === "online" && (
          <>
            <Chips label="Where will it be hosted?" multi options={eventPlatformsFor("online")} value={ev.platforms} onChange={(platforms) => put({ platforms })} error={e.platforms} />
            <TextInput label="Link" value={ev.link} max={LIMITS.link} error={e.link} placeholder="https://discord.gg/..." onChange={(link) => put({ link })} />
            <TextInput label="Room or server details (optional)" value={ev.spot} max={LIMITS.spot} error={e.spot} placeholder="Voice channel #watch-party, password in the chat" onChange={(spot) => put({ spot })} />
          </>
        )}
      </Card>

      <Card title="Who can join" sub="Who is allowed to RSVP.">
        <RadioCards
          label="Open to"
          value={ev.join}
          onChange={(join) => put({ join })}
          options={EVENT_JOIN}
          error={e.join}
        />
        <TextInput
          label="Spots (optional)"
          value={String(ev.capacity ?? "")}
          error={e.capacity}
          hint="Leave empty for no limit."
          placeholder="No limit"
          onChange={(v) => put({ capacity: v.replace(/\D/g, "").slice(0, 4) })}
        />
        <div className="ev-rows">
          <Toggle label="Waitlist when it’s full" hint={ev.capacity ? "People can queue for a free spot" : "Set a number of spots first"} checked={ev.waitlist && !!ev.capacity} disabled={!ev.capacity} onChange={(waitlist) => put({ waitlist })} />
          <Toggle label="Approve RSVPs" hint="You accept each person before they’re in" checked={ev.approval} onChange={(approval) => put({ approval })} />
          <Toggle label="Allow a +1" hint="Guests can bring someone along" checked={ev.plusOnes} onChange={(plusOnes) => put({ plusOnes })} />
          <Toggle label="Show the guest list" hint="Everyone who can see the event sees who’s going" checked={ev.showGuests} onChange={(showGuests) => put({ showGuests })} />
        </div>
      </Card>

      <Card title="Group chat" sub="Made for you automatically. No link to paste.">
        <p className="cmp-note">
          {canCharge && ev.paid
            ? "Your event gets its own group chat when you publish, and you’re the admin. Because entry is paid, the group is locked behind the ticket: only people who’ve got one can read it or write in it."
            : `Your event gets its own group chat when you publish, and you’re the admin. Anyone can join until ${ev.capacity ? `the ${ev.capacity} spots are` : "it’s"} full. Members can write and everyone else can read.`}
        </p>
      </Card>

      <Card title="Entry" sub="Free by default. Hosts on the top plan can charge for tickets.">
        <div className="ev-rows">
          <Toggle
            label="Charge for entry"
            hint={canCharge ? "Off means free entry for everyone" : `Paid events are part of the ${paidPlan} plan`}
            checked={canCharge && !!ev.paid}
            disabled={!canCharge}
            onChange={(paid) => put({ paid, price: paid ? ev.price : "" })}
          />
        </div>
        {canCharge && ev.paid && (
          <>
            <TextInput
              label="Ticket price (US dollars)"
              value={String(ev.price ?? "")}
              max={7}
              error={e.price}
              hint={`From $${LIMITS.ticketMinUsd} to $${LIMITS.ticketMaxUsd}. People see it in their own currency.`}
              placeholder="10.00"
              onChange={(v) => put({ price: v.replace(/[^\d.,]/g, "") })}
            />
            {TICKETS_FREE_WHILE_TESTING && (
              <p className="cmp-note">Ticket checkout is still in testing, so nobody is charged yet. Your price is shown on the event, and payments will switch on once checkout is live.</p>
            )}
          </>
        )}
        {!canCharge && (
          <p className="cmp-note">
            Want to charge for your events? <Link href="/upgrade" className="cmp-link">See the {paidPlan} plan</Link>
          </p>
        )}
        {e.price && !(canCharge && ev.paid) && <p className="cmp-error" role="alert">{e.price}</p>}
      </Card>

      <Card title="Privacy" sub="Who can see the event.">
        <RadioCards
          label="Visibility"
          value={ev.privacy}
          onChange={(privacy) => put({ privacy })}
          options={EVENT_PRIVACY}
          error={e.privacy}
          hint={ev.privacy === "private" && ev.join === "everyone" ? "Only friends and followers can see a private event, so only they can join, whatever “Open to” says." : undefined}
        />
      </Card>

      <Card title="Good to know" sub="Optional details that save people a question.">
        <TextInput label="What to bring or know (optional)" multiline rows={3} value={ev.bring} max={LIMITS.bring} error={e.bring} placeholder="Bring a headset. Arrive 10 minutes early." onChange={(bring) => put({ bring })} />
        <TextInput label="House rules (optional)" multiline rows={3} value={ev.rules} max={LIMITS.rules} error={e.rules} placeholder="Be kind. No spoilers. No griefing." onChange={(rules) => put({ rules })} />
        <TagPicker tags={d.tags} onChange={(tags) => set({ tags })} error={e.tags} />
      </Card>
    </>
  );
}
