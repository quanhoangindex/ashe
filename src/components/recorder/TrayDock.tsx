import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Circle,
  Maximize2,
  Minus,
  PictureInPicture2,
  Radio,
  Settings2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useRecorderContext } from "@/lib/recorder-provider";
import { MAX_ZOOM, MIN_ZOOM } from "@/lib/use-recorder";
import { overlayControls, useIsDesktopApp } from "@/lib/desktop-bridge";
import { formatDuration } from "@/lib/recorder-types";
import { cn } from "@/lib/utils";


const iconButton =
  "glass-button flex size-8 shrink-0 items-center justify-center rounded-full disabled:opacity-40";

/** Floating dock that mirrors the system tray menu: record, pause, stop and zoom. */
export function TrayDock() {
  const [collapsed, setCollapsed] = useState(false);
  const rec = useRecorderContext();
  const isDesktop = useIsDesktopApp();
  const live = rec.status !== "idle";


  if (collapsed) {
    return (
      <div className="fixed bottom-4 right-4 z-30">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="glass-group glass-interactive flex size-12 items-center justify-center rounded-full shadow-lift"
          aria-label="Open tray controls"
        >
          <Radio className="size-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-30 max-w-[calc(100vw-2rem)]">
      <div className="glass-group flex-wrap gap-2 rounded-3xl px-3 py-2.5 shadow-lift">
        <Circle
          className={cn(
            "size-2.5 fill-current",
            live ? "text-live pulse-live" : "text-muted-foreground",
          )}
        />
        <div className="mr-1">
          <p className="text-xs font-semibold leading-tight">Tray controls</p>
          <p className="font-mono text-xs text-muted-foreground tabular-nums">
            {formatDuration(rec.elapsed)}
          </p>
        </div>

        {live ? (
          <>
            <button
              type="button"
              onClick={rec.togglePause}
              className="glass-button rounded-full px-3 py-1.5 text-xs font-medium"
            >
              {rec.status === "recording" ? "Pause" : "Resume"}
            </button>
            <button
              type="button"
              onClick={rec.stop}
              className="glass-danger glass-interactive rounded-full px-3 py-1.5 text-xs font-medium"
            >
              Stop
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={rec.start}
            className="glass-action glass-interactive rounded-full px-3 py-1.5 text-xs font-medium"
          >
            Record
          </button>
        )}

        <span className="mx-1 h-6 w-px bg-border/60" aria-hidden />

        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => rec.nudgeZoom(1 / 1.4)}
          disabled={!live || rec.zoom <= MIN_ZOOM + 0.001}
          className={iconButton}
        >
          <ZoomOut className="size-4" />
        </button>
        <span className="w-11 text-center font-mono text-xs tabular-nums">
          {rec.zoom.toFixed(1)}×
        </span>
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => rec.nudgeZoom(1.4)}
          disabled={!live || rec.zoom >= MAX_ZOOM - 0.001}
          className={iconButton}
        >
          <ZoomIn className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Reset zoom"
          onClick={rec.resetZoom}
          disabled={!live}
          className={iconButton}
        >
          <Maximize2 className="size-4" />
        </button>

        <span className="mx-1 h-6 w-px bg-border/60" aria-hidden />

        <Link to="/settings" aria-label="Open settings" className={iconButton}>
          <Settings2 className="size-4" />
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="glass-button ml-1 flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
          aria-label="Collapse tray controls"
        >
          <Minus className="size-4" />
        </button>
      </div>
    </div>
  );
}
