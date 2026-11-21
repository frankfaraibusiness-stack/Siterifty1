// Small outline icons for the welcome tour (24px grid, 2px round stroke), drawn
// in the same style as the main nav. Colour comes from `currentColor`.

const PATHS = {
  feed: <path d="M4 11.2 12 4l8 7.2V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />,
  reel: (
    <>
      <rect x="6" y="3" width="12" height="18" rx="3" />
      <path d="m10.5 9.5 4 2.5-4 2.5z" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M2.8 20c.4-3.6 3-5.6 6.2-5.6s5.8 2 6.2 5.6" />
      <circle cx="17.4" cy="9.4" r="2.4" />
      <path d="M17.6 14.6c2.3.2 3.9 1.9 4.2 4.6" />
    </>
  ),
  chat: (
    <>
      <path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7l-4.5 3.5V17H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <path d="M8.5 9.5h.01M12 9.5h.01M15.5 9.5h.01" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  live: (
    <>
      <circle cx="12" cy="12" r="2.2" />
      <path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2" />
    </>
  ),
  map: (
    <>
      <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z" />
      <path d="M9 3v15M15 6v15" />
    </>
  ),
  share: (
    <>
      <rect x="3.5" y="4" width="17" height="16" rx="4" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="m4.5 17 4.6-4.4 3.4 3 3-2.6 4.5 4" />
    </>
  ),
  discuss: (
    <>
      <path d="M4 5.5h16a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1H10l-4.6 3.6a.5.5 0 0 1-.8-.4V17H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1z" />
      <path d="M8 10.2h8M8 13h5" />
    </>
  ),
  connect: (
    <>
      <circle cx="7" cy="12" r="3" />
      <circle cx="17" cy="7" r="2.5" />
      <circle cx="17" cy="17" r="2.5" />
      <path d="m9.7 10.6 4.9-2.4M9.7 13.4l4.9 2.4" />
    </>
  ),
  poll: (
    <>
      <path d="M5 20V10M12 20V4M19 20v-7" />
    </>
  ),
  bulb: (
    <>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" />
    </>
  ),
  heart: <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z" />,
  star: <path d="M12 3l2.6 6 6.4.6-4.8 4.2 1.4 6.2L12 16.8 6.4 20l1.4-6.2L3 9.6 9.4 9z" />,
  palette: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18c1.3 0 2-.8 2-1.7 0-.5-.2-.9-.5-1.3-.3-.4-.5-.8-.5-1.3 0-.9.8-1.7 1.7-1.7H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z" />
      <path d="M7.6 11h.01M10 7.6h.01M14.4 7.6h.01" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 4.5 6v5.6c0 4.5 3 8 7.5 9.4 4.5-1.4 7.5-4.9 7.5-9.4V6z" />
      <path d="m8.8 12 2.4 2.4 4.2-4.6" />
    </>
  ),
  eyeoff: (
    <>
      <path d="M3 12s3.5-6.5 9-6.5c1.6 0 3 .5 4.3 1.3M21 12s-3.5 6.5-9 6.5c-1.6 0-3-.5-4.3-1.3" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M4 4l16 16" />
    </>
  ),
  gift: (
    <>
      <rect x="3.5" y="9" width="17" height="11.5" rx="2" />
      <path d="M3 9h18v-0.5M12 9v11.5" />
      <path d="M12 9c-1.2-3.4-5.2-4-5.2-1.6C6.8 9 9 9 12 9zM12 9c1.2-3.4 5.2-4 5.2-1.6C17.2 9 15 9 12 9z" />
    </>
  ),
  flag: (
    <>
      <path d="M5 21V4M5 4.5c3-1.8 5 1.2 8 0s4.2-.6 6 .4v8c-1.8-1-3-1.4-6 .1s-5-1.3-8 .5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.6" />
      <path d="M4.8 20c.7-4 3.7-6 7.2-6s6.5 2 7.2 6" />
    </>
  ),
  plus: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  bolt: <path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z" />,
  spark: (
    <>
      <path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z" />
      <path d="M19 16.5c.2 1.6.9 2.3 2.5 2.5-1.6.2-2.3.9-2.5 2.5-.2-1.6-.9-2.3-2.5-2.5 1.6-.2 2.3-.9 2.5-2.5z" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6" />,
  trophy: (
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5c0 3 1.3 4.6 3.7 5M16 6h3.5c0 3-1.3 4.6-3.7 5" />
      <path d="M12 13v4M8.5 20.5h7M10 17h4" />
    </>
  ),
  car: (
    <>
      <path d="M4 15.5v-3l2-4.5h12l2 4.5v3M3.5 15.5h17v2.5h-17z" />
      <path d="M7 15.5h.01M17 15.5h.01" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </>
  ),
};

export default function OIcon({ name, className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {PATHS[name] || PATHS.star}
    </svg>
  );
}
