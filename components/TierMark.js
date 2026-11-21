// One distinct mark per plan so the cards read differently at a glance.
export default function TierMark({ id }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
  if (id === "drifter") {
    // palm tree
    return (
      <svg {...common}>
        <path d="M12 21V11" />
        <path d="M12 11c-1-3-4-4.5-7-4 2 .2 3.8 1.2 5 3" />
        <path d="M12 11c1-3 4-4.5 7-4-2 .2-3.8 1.2-5 3" />
        <path d="M12 11c-3-.5-5.5.8-7 3.2 2.2-1.3 4.5-1.6 7-.7" />
        <path d="M12 11c3-.5 5.5.8 7 3.2-2.2-1.3-4.5-1.6-7-.7" />
        <path d="M8 21h8" />
      </svg>
    );
  }
  if (id === "wheelman") {
    // steering wheel
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="2.2" />
        <path d="M12 14.2V21M9.9 11.2 3.4 9.6M14.1 11.2l6.5-1.6" />
      </svg>
    );
  }
  if (id === "mastermind") {
    // crosshair / blueprint target
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="7.5" />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M12 2v4.5M12 17.5V22M2 12h4.5M17.5 12H22" />
      </svg>
    );
  }
  if (id === "creatorplus") {
    // coin with a dollar sign: earn from your content
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M14.8 9.3c-.4-1-1.4-1.6-2.8-1.6-1.6 0-2.8.9-2.8 2.1 0 2.9 5.8 1.5 5.8 4.3 0 1.3-1.3 2.2-3 2.2-1.4 0-2.5-.6-3-1.7" />
        <path d="M12 5.8v1.9M12 16.3v1.9" />
      </svg>
    );
  }
  // crown
  return (
    <svg {...common}>
      <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8z" />
      <path d="M5.5 22h13" />
    </svg>
  );
}
