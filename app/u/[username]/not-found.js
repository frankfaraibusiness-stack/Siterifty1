import Link from "next/link";

export default function ProfileNotFound() {
  return (
    <main className="pf-page">
      <div className="pf-empty" style={{ marginTop: 120 }}>
        <h2 className="pf-empty-title">No one by that name in Leonida</h2>
        <p className="pf-empty-sub">
          This profile doesn&apos;t exist, or the handle was typed wrong.
        </p>
        <Link href="/" className="pf-btn pf-btn-primary">
          Back to the feed
        </Link>
      </div>
    </main>
  );
}
