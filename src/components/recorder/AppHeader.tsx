import { Link } from "@tanstack/react-router";
import { Circle, Radio } from "lucide-react";
import { useRecorderContext } from "@/lib/recorder-provider";
import { formatDuration } from "@/lib/recorder-types";
import { cn } from "@/lib/utils";

const navLink =
  "glass-interactive rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground";

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

        <nav className="glass-group ml-auto gap-1 rounded-full p-1">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            activeProps={{ className: "bg-accent text-accent-foreground" }}
            className={navLink}
          >
            Record
          </Link>
          <Link
            to="/settings"
            activeProps={{ className: "bg-accent text-accent-foreground" }}
            className={navLink}
          >
            Settings
          </Link>
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
