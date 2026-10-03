import { Link } from "@tanstack/react-router";
import { BrandMark } from "@/components/brand-mark";
import { AuthSlot } from "@/components/auth-slot";

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="shrink-0">
          <BrandMark />
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
          <Link to="/demo" className="hover:text-ink">
            Live demo
          </Link>
          <Link to="/pricing" className="hover:text-ink">
            Pricing
          </Link>
          <Link to="/" hash="how" className="hover:text-ink">
            How it works
          </Link>
        </nav>
        <AuthSlot />
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between">
        <BrandMark />
        <p className="text-sm text-muted">Train once. Answer everywhere. Free while we launch.</p>
      </div>
    </footer>
  );
}
