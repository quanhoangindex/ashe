import { Link, useLocation } from "@tanstack/react-router";
import { Disc, Radio, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const tabBase =
  "relative flex h-8 min-w-8 shrink-0 items-center justify-center gap-1 rounded-full px-3 text-xs font-medium whitespace-nowrap";

function tabClass(isActive: boolean) {
  return isActive
    ? cn(tabBase, "glass-action glass-interactive text-brand-foreground")
    : cn(
        tabBase,
        "text-muted-foreground opacity-70 transition-colors hover:opacity-100 hover:text-foreground",
      );
}

function RecordTab({
  exact,
  label,
  children,
}: {
  exact?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const { pathname } = useLocation();
  const isActive = exact ? pathname === "/" : pathname.startsWith("/");
  return (
    <Link
      to="/"
      aria-label={label}
      title={label}
      className={tabClass(isActive)}
    >
      {children}
    </Link>
  );
}

function SettingsGear({
  label,
}: {
  label: string;
}) {
  const { pathname } = useLocation();
  const isActive = pathname.startsWith("/settings");
  return (
    <Link
      to="/settings"
      aria-label={label}
      title={label}
      className={tabClass(isActive)}
    >
      <Settings className="size-4" />
    </Link>
  );
}

export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border/50 bg-background/60 backdrop-blur-2xl backdrop-saturate-150">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <span className="flex size-9 items-center justify-center rounded-xl bg-brand text-brand-foreground">
          <Radio className="size-4" />
        </span>
        <div>
          <h1 className="text-lg font-semibold leading-none">Reel</h1>
          <p className="text-xs text-muted-foreground">Desktop screen recorder</p>
        </div>

        <nav
          className="glass-group relative ml-auto rounded-full p-0 before:pointer-events-none before:absolute before:inset-0 before:rounded-full before:shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)]"
          aria-label="Primary"
        >
          <RecordTab exact label="Record">
            <Disc className="size-3.5" />
            Record
          </RecordTab>
          <SettingsGear label="Settings" />
        </nav>

      </div>
    </header>
  );
}
