import { Link, useLocation } from "@tanstack/react-router";
import { Circle, Radio, Settings } from "lucide-react";
import { useRecorderContext } from "@/lib/recorder-provider";
import { formatDuration } from "@/lib/recorder-types";
import { cn } from "@/lib/utils";

const tabBase =
  "relative flex h-7 min-w-7 shrink-0 items-center justify-center gap-1 rounded-full px-2.5 text-xs font-medium whitespace-nowrap transition-colors";

function tabClass(isActive: boolean) {
  return isActive
    ? cn(tabBase, "glass-action text-brand-foreground shadow-soft")
    : cn(
        tabBase,
        "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      );
}

function GlassTab({
  to,
  exact,
  label,
  children,
}: {
  to: "/" | "/settings";
  exact?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const { pathname } = useLocation();
  const isActive = exact ? pathname === to : pathname.startsWith(to);
  return (
    <Link to={to} aria-label={label} title={label} className={tabClass(isActive)}>
      {children}
    </Link>
  );
}

export function AppHeader() {
  const { status, elapsed } = useRecorderContext();
  const live = status !== "idle";

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

        <nav className="glass-group ml-auto gap-1 rounded-full p-1" aria-label="Primary">
          <GlassTab to="/" exact label="Record">
            Record
          </GlassTab>
          <GlassTab to="/settings" label="Settings">
            <Settings className="size-4" />
          </GlassTab>
        </nav>

        <div className="glass-group gap-2 rounded-full px-3 py-1.5 text-xs font-medium">
          <Circle
            className={cn(
              "size-2 fill-current",
              live ? "text-live pulse-live" : "text-muted-foreground",
            )}
          />
          {live ? `Live · ${formatDuration(elapsed)}` : "Idle"}
        </div>
      </div>
    </header>
  );
}
