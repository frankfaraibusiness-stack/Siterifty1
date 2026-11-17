import { mediaChip } from "@/lib/card-helpers";

const ICONS = {
  photos: (
    <>
      <rect x="3" y="6" width="14" height="12" rx="2.5" />
      <path d="M7 3.5h12.5A1.5 1.5 0 0 1 21 5v10" />
    </>
  ),
  play: <path d="M8 5.5v13l11-6.5z" />,
};

// A small label over a post's media: how many photos, or a video's length.
export default function MediaChip({ media }) {
  const chip = mediaChip(media);
  if (!chip) return null;
  return (
    <span className="media-chip">
      <svg width="13" height="13" viewBox="0 0 24 24" fill={chip.icon === "play" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {ICONS[chip.icon]}
      </svg>
      {chip.label}
    </span>
  );
}
