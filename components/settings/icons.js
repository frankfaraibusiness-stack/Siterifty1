// Small stroke icons for the settings page. Sized by CSS (see .st-ico).
const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export const CharacterIcon = () => (
  <svg {...base}>
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <circle cx="9" cy="10.5" r="2.4" />
    <path d="M5.6 17c.5-2 1.9-3 3.4-3s2.9 1 3.4 3" />
    <path d="M15 9.5h3M15 13h3" />
  </svg>
);

export const StashIcon = () => (
  <svg {...base}>
    <rect x="3" y="7.5" width="18" height="12.5" rx="2.5" />
    <path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5" />
    <path d="M3 13h18M11 13v2.2h2V13" />
  </svg>
);

export const WantedIcon = () => (
  <svg {...base}>
    <path d="M12 3.2l2.6 5.4 5.9.8-4.3 4.2 1 5.9L12 16.6 6.8 19.5l1-5.9L3.5 9.4l5.9-.8z" />
  </svg>
);

export const LeakIcon = () => (
  <svg {...base}>
    <path d="M3 5h18l-6.8 7.6V19l-4.4-2v-4.4z" />
  </svg>
);

export const LookIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" />
  </svg>
);

export const GearIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.6-2-3.4-2.4.9a7.6 7.6 0 0 0-2.6-1.5L14 2.4h-4l-.4 2.5A7.6 7.6 0 0 0 7 6.4l-2.4-.9-2 3.4 2 1.6a7.6 7.6 0 0 0 0 3l-2 1.6 2 3.4 2.4-.9a7.6 7.6 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 2.6-1.5l2.4.9 2-3.4z" />
  </svg>
);

export const ChevronIcon = () => (
  <svg {...base}>
    <path d="M9 5.5l6.5 6.5L9 18.5" />
  </svg>
);

export const BackIcon = () => (
  <svg {...base}>
    <path d="M15 5.5L8.5 12 15 18.5" />
  </svg>
);

export const CameraIcon = () => (
  <svg {...base}>
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7H8l1.4-2h5.2L16 7h2.5A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
    <circle cx="12" cy="13" r="3.2" />
  </svg>
);

export const StarIcon = ({ filled }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={filled ? "st-star on" : "st-star"}>
    <path d="M12 2.8l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.6l-5.8 3.1 1.1-6.5L2.6 9.6l6.5-.9z" />
  </svg>
);

export const LockIcon = () => (
  <svg {...base}>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2.5" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </svg>
);

export const GlobeIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.4 2.4 3.6 5.2 3.6 8.5s-1.2 6.1-3.6 8.5c-2.4-2.4-3.6-5.2-3.6-8.5s1.2-6.1 3.6-8.5z" />
  </svg>
);

export const DownloadIcon = () => (
  <svg {...base}>
    <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14" />
  </svg>
);

export const LogoutIcon = () => (
  <svg {...base}>
    <path d="M9.5 4.5H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 19.5h3.5M15 8l4 4-4 4M19 12H9.5" />
  </svg>
);
