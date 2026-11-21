// Small line icons for the Advertise page, so nothing there depends on how a
// phone or browser draws emoji. Each one is 1em by default, so the existing
// font-size on its wrapper sizes it; pass `size` to override. They take their
// colour from the surrounding text (currentColor).
function Svg({ size = "1em", strokeWidth = 1.8, children, fill = "none" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const ImageIc = (p) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <circle cx="9" cy="10" r="1.7" />
    <path d="M21 16l-4.6-4.6L8 20" />
  </Svg>
);

export const VideoIc = (p) => (
  <Svg {...p}>
    <rect x="2.5" y="6" width="13" height="12" rx="3" />
    <path d="M15.5 10.5l6-3.5v10l-6-3.5" />
  </Svg>
);

export const MegaphoneIc = (p) => (
  <Svg {...p}>
    <path d="M3 10.5v3a1 1 0 0 0 1 1h2.5L15 18.5v-13L6.5 9.5H4a1 1 0 0 0-1 1z" />
    <path d="M18.5 9.5a4 4 0 0 1 0 5" />
    <path d="M7 14.5l1.3 5h2.4l-.9-4" />
  </Svg>
);

export const LayersIc = (p) => (
  <Svg {...p}>
    <path d="M12 2.5l9 5-9 5-9-5z" />
    <path d="M3 12l9 5 9-5" />
    <path d="M3 16.5l9 5 9-5" />
  </Svg>
);

export const BarsIc = (p) => (
  <Svg {...p}>
    <path d="M5 20v-8M12 20V4M19 20v-6" />
  </Svg>
);

export const UploadIc = (p) => (
  <Svg {...p}>
    <path d="M12 16V4" />
    <path d="M7 9l5-5 5 5" />
    <path d="M5 20h14" />
  </Svg>
);

export const PlayIc = (p) => (
  <Svg {...p} fill="currentColor" strokeWidth={1.4}>
    <path d="M8 5.5v13l11-6.5z" />
  </Svg>
);

export const SoundIc = (p) => (
  <Svg {...p}>
    <path d="M4 9.6v4.8h3.6l4.4 3.8V5.8L7.6 9.6z" />
    <path d="M15.6 9.2a4 4 0 0 1 0 5.6" />
    <path d="M18.3 6.6a7.6 7.6 0 0 1 0 10.8" />
  </Svg>
);

export const SoundOffIc = (p) => (
  <Svg {...p}>
    <path d="M4 9.6v4.8h3.6l4.4 3.8V5.8L7.6 9.6z" />
    <path d="M16 9.5l5 5M21 9.5l-5 5" />
  </Svg>
);

export const CheckIc = ({ strokeWidth = 3, ...p }) => (
  <Svg strokeWidth={strokeWidth} {...p}>
    <path d="M20 6L9 17l-5-5" />
  </Svg>
);

export const BackIc = (p) => (
  <Svg {...p} strokeWidth={2.2}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </Svg>
);

export const OutIc = (p) => (
  <Svg {...p} strokeWidth={2.4}>
    <path d="M7 17L17 7M8 7h9v9" />
  </Svg>
);
