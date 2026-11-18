// Line icons for the Story Maker and the viewer's reply bar (no emoji anywhere).
// All are 24x24, stroke = currentColor; the styles set fill / stroke width.
const base = { viewBox: "0 0 24 24", "aria-hidden": true, focusable: "false" };

export const PhotoIcon = () => (
  <svg {...base}>
    <rect x="3" y="4.5" width="18" height="15" rx="3" />
    <circle cx="9" cy="10" r="1.8" />
    <path d="m4 17.5 5-4.6 3.4 3 2.6-2.2L20 17" />
  </svg>
);

export const ClipIcon = () => (
  <svg {...base}>
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="M10.2 9.2v5.6l4.8-2.8z" />
    <path d="M7 5v14M17 5v14" opacity=".35" />
  </svg>
);

export const GlobeIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3c2.6 2.5 3.9 5.5 3.9 9S14.6 18.5 12 21c-2.6-2.5-3.9-5.5-3.9-9S9.4 5.5 12 3z" />
  </svg>
);

// Friends and followers together: a small crowd.
export const CrowdIcon = () => (
  <svg {...base}>
    <circle cx="9" cy="8.5" r="3" />
    <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
    <circle cx="17" cy="9.5" r="2.4" />
    <path d="M16.2 14.3a4.6 4.6 0 0 1 4.8 4.2" />
  </svg>
);

// Friends: two people with a small heart above them.
export const FriendsIcon = () => (
  <svg {...base}>
    <circle cx="7.5" cy="11" r="2.6" />
    <path d="M2.5 20a5 5 0 0 1 10 0" />
    <circle cx="16.5" cy="11" r="2.6" />
    <path d="M11.5 20a5 5 0 0 1 10 0" />
    <path d="M12 7.2s-2.4-1.5-2.4-3.1a1.3 1.3 0 0 1 2.4-.7 1.3 1.3 0 0 1 2.4.7c0 1.6-2.4 3.1-2.4 3.1z" />
  </svg>
);

// Followers: a person with a little "+" beside them.
export const FollowersIcon = () => (
  <svg {...base}>
    <circle cx="10" cy="8" r="3.4" />
    <path d="M3.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M19 6.5v5M16.5 9h5" />
  </svg>
);

export const ChatIcon = () => (
  <svg {...base}>
    <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.1A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z" />
  </svg>
);

export const ChatOffIcon = () => (
  <svg {...base}>
    <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.1A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z" />
    <path d="M4 4l16 16" />
  </svg>
);

export const ScissorsIcon = () => (
  <svg {...base}>
    <circle cx="6" cy="6.5" r="2.8" />
    <circle cx="6" cy="17.5" r="2.8" />
    <path d="M8.4 8 20 18M8.4 16 20 6" />
  </svg>
);

export const PlayIcon = () => (
  <svg {...base}>
    <path d="M8 5.5v13l11-6.5z" />
  </svg>
);

export const PauseIcon = () => (
  <svg {...base}>
    <path d="M8 5.5v13M16 5.5v13" />
  </svg>
);

export const SwapIcon = () => (
  <svg {...base}>
    <path d="M4 8h13l-3-3" />
    <path d="M20 16H7l3 3" />
  </svg>
);

export const BoltIcon = () => (
  <svg {...base}>
    <path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z" />
  </svg>
);

export const SendIcon = () => (
  <svg {...base}>
    <path d="M21 3 10 14" />
    <path d="M21 3l-7 18-4-7-7-4z" />
  </svg>
);

export const ClockIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5.2l3.2 2" />
  </svg>
);

export const CheckIcon = () => (
  <svg {...base}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

export const CloseIcon = () => (
  <svg {...base}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const LockIcon = () => (
  <svg {...base}>
    <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </svg>
);

export const UploadIcon = () => (
  <svg {...base}>
    <path d="M12 16V4M7 9l5-5 5 5" />
    <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </svg>
);

export const VolumeOnIcon = () => (
  <svg {...base}>
    <path d="M4 9.6v4.8h3.6l4.4 3.8V5.8L7.6 9.6z" />
    <path d="M15.6 9.2a4 4 0 0 1 0 5.6" />
    <path d="M18.3 6.6a7.6 7.6 0 0 1 0 10.8" />
  </svg>
);

export const VolumeMutedIcon = () => (
  <svg {...base}>
    <path d="M4 9.6v4.8h3.6l4.4 3.8V5.8L7.6 9.6z" />
    <path d="M16 9.6l4.6 4.8M20.6 9.6 16 14.4" />
  </svg>
);

// Audience id -> icon, shared by the composer cards and the viewer.
export const AUDIENCE_ICON = {
  public: GlobeIcon,
  connections: CrowdIcon,
  friends: FriendsIcon,
  followers: FollowersIcon,
};
