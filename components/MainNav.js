const NAV_LINKS = ["Main Feed", "Communities", "Messages", "Leaderboard"];

export default function MainNav() {
  return (
    <nav className="main-nav">
      {NAV_LINKS.map((label, i) => (
        <a
          key={label}
          href="#"
          className={`nav-link${i === 0 ? " active" : ""}`}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
