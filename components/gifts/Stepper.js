const STEPS = ["Gift", "Recipient", "Review", "Sent"];

// Checkout progress: 1 Gift, 2 Recipient, 3 Review, 4 Sent. `step` is the
// current one (1 to 4); earlier steps show a tick.
export default function Stepper({ step = 1 }) {
  return (
    <ol className="gf-steps" aria-label="Checkout steps">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const state = n < step || step === 4 ? "done" : n === step ? "now" : "todo";
        return (
          <li
            key={label}
            className={`gf-step is-${state}`}
            aria-current={n === step ? "step" : undefined}
          >
            <span className="gf-step-dot">
              {state === "done" ? (
                <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              ) : (
                n
              )}
            </span>
            <span className="gf-step-label">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
