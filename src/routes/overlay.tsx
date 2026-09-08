import { createFileRoute } from "@tanstack/react-router";
import { Circle, ChevronDown, ChevronUp, Maximize2, X, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";
import { overlayControls, useOverlayUpdates } from "@/lib/desktop-bridge";
import { formatDuration } from "@/lib/recorder-types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/overlay")({
  head: () => ({
    meta: [
      { title: "Reel — Floating Recording Controls" },
      {
        name: "description",
        content:
          "A small always-on-top panel with a live preview of what you are recording plus record, pause, stop and zoom controls.",
      },
      { property: "og:title", content: "Reel — Floating Recording Controls" },
      {
        property: "og:description",
        content: "Keep an eye on your recording and control it from any app.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Overlay,
});

const iconButton =
  "glass-button flex size-8 shrink-0 items-center justify-center rounded-full disabled:opacity-40";

function Overlay() {
  const [showPreview, setShowPreview] = useState(true);
  const { status, elapsed, zoom, frame } = useOverlayUpdates();
  const live = status !== "idle";

  const togglePreview = () => {
    const next = !showPreview;
    setShowPreview(next);
    overlayControls.setPreview(next);
  };

  return (
    <div className="min-h-screen bg-transparent p-2">
      <div
        className="glass-group flex-col items-stretch gap-2 rounded-3xl p-2 shadow-lift"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        {showPreview && (
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-black/80">
            {frame ? (
              <img src={frame} alt="Live preview of the screen being recorded" className="w-full" />
            ) : (
              <div className="flex h-[150px] items-center justify-center text-xs text-muted-foreground">
                Waiting for the picture…
              </div>
            )}
          </div>
        )}

        <div
          className="flex items-center gap-1.5"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          <Circle
            className={cn(
              "ml-1 size-2.5 shrink-0 fill-current",
              live ? "text-live pulse-live" : "text-muted-foreground",
            )}
          />
          <span className="mr-1 font-mono text-xs tabular-nums">{formatDuration(elapsed)}</span>

          {live ? (
            <>
              <button
                type="button"
                onClick={() => overlayControls.send("toggle-pause")}
                className="glass-button rounded-full px-2.5 py-1 text-xs font-medium"
              >
                {status === "recording" ? "Pause" : "Resume"}
              </button>
              <button
                type="button"
                onClick={() => overlayControls.send("stop")}
                className="glass-danger glass-interactive rounded-full px-2.5 py-1 text-xs font-medium"
              >
                Stop
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => overlayControls.send("start")}
              className="glass-action glass-interactive rounded-full px-2.5 py-1 text-xs font-medium"
            >
              Record
            </button>
          )}

          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => overlayControls.send("zoom-out")}
            className={iconButton}
          >
            <ZoomOut className="size-4" />
          </button>
          <span className="w-9 text-center font-mono text-xs tabular-nums">
            {zoom.toFixed(1)}×
          </span>
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => overlayControls.send("zoom-in")}
            className={iconButton}
          >
            <ZoomIn className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Reset zoom"
            onClick={() => overlayControls.send("zoom-reset")}
            className={iconButton}
          >
            <Maximize2 className="size-4" />
          </button>

          <button
            type="button"
            aria-label={showPreview ? "Hide preview" : "Show preview"}
            onClick={togglePreview}
            className={iconButton}
          >
            {showPreview ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          </button>
          <button
            type="button"
            aria-label="Close floating controls"
            onClick={() => overlayControls.hide()}
            className={iconButton}
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
