// A small round icon next to a member's name: Venus (female) or Mars (male).
// Only rendered when the member shows their gender (Settings > Who can see your account).
export default function GenderIcon({ gender, className = "" }) {
  if (gender !== "female" && gender !== "male") return null;
  const female = gender === "female";
  return (
    <span
      className={`gdr gdr-${gender} ${className}`.trim()}
      role="img"
      aria-label={female ? "Female" : "Male"}
      title={female ? "Female" : "Male"}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {female ? (
          <path d="M12 3a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM12 14v7M8.5 18h7" />
        ) : (
          <path d="M10 8.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM14 10l6-6M15 4h5v5" />
        )}
      </svg>
    </span>
  );
}
