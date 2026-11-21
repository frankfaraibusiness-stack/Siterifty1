// 24px outline icons for the Wallet page (server-safe, no client code).
const base = { viewBox: "0 0 24 24", "aria-hidden": "true", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

export const WalletIcon = () => (
  <svg {...base}>
    <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" />
    <path d="M4 7.5V17a2 2 0 0 0 2 2h12.5a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 18.5 8H6.5A2.5 2.5 0 0 1 4 7.5z" />
    <circle cx="16.2" cy="13.5" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);
export const DepositIcon = () => (
  <svg {...base}>
    <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" />
    <path d="M5 19.5h14" />
  </svg>
);
export const WithdrawIcon = () => (
  <svg {...base}>
    <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" />
    <path d="M5 19.5h14" />
  </svg>
);
export const CardIcon = () => (
  <svg {...base}>
    <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
    <path d="M3 10h18M7 15h3" />
  </svg>
);
export const AdsIcon = () => (
  <svg {...base}>
    <path d="M3.5 10.5v3a1 1 0 0 0 1 1H7l6 4.5V5L7 9.5H4.5a1 1 0 0 0-1 1z" />
    <path d="M17 8.5a5 5 0 0 1 0 7" />
  </svg>
);
export const GiftIcon = () => (
  <svg {...base}>
    <rect x="4" y="9" width="16" height="11" rx="2" />
    <path d="M12 9v11M3.5 9h17M12 9C9.5 9 7.5 7.8 7.5 6.2 7.5 4.9 8.7 4.2 9.8 4.5 11 4.9 12 7 12 9zm0 0c2.5 0 4.5-1.2 4.5-2.8 0-1.3-1.2-2-2.3-1.7C13 4.9 12 7 12 9z" />
  </svg>
);
export const PerkIcon = () => (
  <svg {...base}>
    <path d="m12 3.5 2.4 5 5.4.7-4 3.8 1 5.4L12 15.7 7.2 18.4l1-5.4-4-3.8 5.4-.7z" />
  </svg>
);
export const InviteIcon = () => (
  <svg {...base}>
    <circle cx="9.5" cy="8.5" r="3.5" />
    <path d="M3 20c.5-3.6 3-5.5 6.5-5.5s6 1.9 6.5 5.5" />
    <path d="M18.5 8v6M15.5 11h6" />
  </svg>
);
export const SparkIcon = () => (
  <svg {...base}>
    <path d="M12 4v4M12 16v4M4 12h4M16 12h4M7 7l2.5 2.5M14.5 14.5 17 17M17 7l-2.5 2.5M9.5 14.5 7 17" />
  </svg>
);
export const ShieldIcon = () => (
  <svg {...base}>
    <path d="M12 3.5 5 6v5.5c0 4.2 2.9 7.4 7 9 4.1-1.6 7-4.8 7-9V6z" />
    <path d="m9 12 2.2 2.2L15 10.4" />
  </svg>
);
export const ClockIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);
export const HeartIcon = () => (
  <svg {...base}>
    <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z" />
  </svg>
);
