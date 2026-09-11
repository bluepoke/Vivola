import type { ReactNode } from "react";

// The branding bar shown at the top of every screen — logo and kicker on the
// left, page-specific navigation (or nothing, for public/kiosk screens like
// Join and Presentation) on the right.
export function SiteHeader({ nav }: { nav?: ReactNode }) {
  return (
    <header className="nav">
      <div className="nav-inner">
        <div className="nav-brand">
          <img src="/vivola-logo.svg" alt="Vivola" style={{ height: 20 }} />
          <span className="nav-kicker">Live surveys &amp; quizzes</span>
        </div>
        {nav ? <div className="nav-links">{nav}</div> : null}
      </div>
    </header>
  );
}
