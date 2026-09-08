import { useCallback, useEffect, useRef } from "react";
import { Circle, Maximize2, Pause, Play, Square, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/recorder-types";
import { modifierLabel } from "@/lib/platform";
import { MAX_ZOOM, MIN_ZOOM, type CaptureInfo } from "@/lib/use-recorder";

type Props = {
  stream: MediaStream | null;
  status: "idle" | "recording" | "paused";
  elapsed: number;
  level: number;
  zoom: number;
  captureInfo: CaptureInfo | null;
  onZoom: (next: number, focus?: { x: number; y: number }) => void;
  onResetZoom: () => void;
  onStart: () => void;
  onStop: () => void;
  onTogglePause: () => void;
};

export function StageView({
  stream,
  status,
  elapsed,
  level,
  zoom,
  captureInfo,
  onZoom,
  onResetZoom,
  onStart,
  onStop,
  onTogglePause,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  const live = status !== "idle";

  /** Where in the full frame (0..1) the pointer is, accounting for current zoom + letterboxing. */
  const pointToFrame = useCallback((clientX: number, clientY: number) => {
    const el = videoRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const vw = el.videoWidth || rect.width;
    const vh = el.videoHeight || rect.height;
    const scale = Math.min(rect.width / vw, rect.height / vh);
    const dw = vw * scale;
    const dh = vh * scale;
    const ox = (rect.width - dw) / 2;
    const oy = (rect.height - dh) / 2;
    const u = (clientX - rect.left - ox) / dw;
    const v = (clientY - rect.top - oy) / dh;
    if (u < 0 || u > 1 || v < 0 || v > 1) return null;
    // The preview already shows the zoomed crop, so map back into full-frame space.
    const z = zoomRef.current;
    return { x: 0.5 + (u - 0.5) / z, y: 0.5 + (v - 0.5) / z };
  }, []);

  const handleWheelRef = useRef<(e: WheelEvent) => void>(() => {});
  handleWheelRef.current = (e: WheelEvent) => {
    if (!live) return;
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
    const next = zoomRef.current * Math.exp(-dy * 0.0015);
    onZoom(next, pointToFrame(e.clientX, e.clientY) ?? undefined);
  };

  useEffect(() => {
    const el = videoRef.current?.parentElement;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      handleWheelRef.current(e);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <section className="glass-panel overflow-hidden">
      <div className="relative aspect-video w-full touch-none bg-primary">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          onClick={(e) => {
            if (!live) return;
            const p = pointToFrame(e.clientX, e.clientY);
            if (p) onZoom(zoomRef.current > 1 ? zoomRef.current : 2, p);
          }}
          className={cn(
            "size-full object-contain",
            live ? "opacity-100 cursor-crosshair" : "opacity-0",
          )}
        />
        {!live && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-grain">
            <span className="text-display text-4xl text-primary-foreground">Ready when you are</span>
            <p className="max-w-sm text-center text-sm text-primary-foreground/70">
              Hit record to pick your screen or window. A live preview shows up here, and you can change what gets captured in Settings.
            </p>
          </div>
        )}
        {live && (
          <div className="glass-group absolute left-4 top-4 gap-2 rounded-full px-3 py-1.5 text-xs font-semibold">
            <Circle
              className={cn(
                "size-2.5 fill-current text-live",
                status === "recording" && "pulse-live",
              )}
            />
            {status === "recording" ? "Recording" : "Paused"} · {formatDuration(elapsed)}
          </div>
        )}
        {live && (
          <div className="glass-group absolute right-4 top-4 gap-1 rounded-full p-1 text-xs font-semibold">
            <button
              type="button"
              aria-label="Zoom out"
              onClick={() => onZoom(zoom / 1.4)}
              disabled={zoom <= MIN_ZOOM + 0.001}
              className="glass-interactive flex size-7 items-center justify-center rounded-full disabled:opacity-40"
            >
              <ZoomOut className="size-4" />
            </button>
            <span className="w-12 text-center font-mono tabular-nums">{zoom.toFixed(1)}×</span>
            <button
              type="button"
              aria-label="Zoom in"
              onClick={() => onZoom(zoom * 1.4)}
              disabled={zoom >= MAX_ZOOM - 0.001}
              className="glass-interactive flex size-7 items-center justify-center rounded-full disabled:opacity-40"
            >
              <ZoomIn className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Reset zoom"
              onClick={onResetZoom}
              className="glass-interactive flex size-7 items-center justify-center rounded-full"
            >
              <Maximize2 className="size-4" />
            </button>
          </div>
        )}
        {live && (
          <div className="glass-group absolute bottom-3 left-4 gap-2 rounded-full px-2.5 py-1">
            {captureInfo && (
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                {captureInfo.width}×{captureInfo.height} · {captureInfo.fps} fps ·{" "}
                {captureInfo.codec}
              </span>
            )}
          </div>
        )}
        {live && (
          <p className="glass-group absolute bottom-3 left-1/2 max-w-[60%] -translate-x-1/2 truncate rounded-full px-3 py-1 text-[11px] text-muted-foreground">
            Scroll or click here, or press {modifierLabel()} + − / = / 0 — zoom follows your mouse
            and is baked into the recording
          </p>
        )}

      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border/60 p-4">
        {status === "idle" ? (
          <Button
            size="lg"
            variant="ghost"
            onClick={onStart}
            className="glass-action glass-interactive gap-2 hover:text-brand-foreground"
          >
            <Circle className="size-3.5 fill-current" />
            Start recording
          </Button>
        ) : (
          <>
            <Button
              size="lg"
              variant="ghost"
              onClick={onStop}
              className="glass-danger glass-interactive gap-2 hover:text-destructive-foreground"
            >
              <Square className="size-3.5 fill-current" />
              Stop
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={onTogglePause}
              className="glass-group glass-interactive gap-2 rounded-md px-6"
            >
              {status === "recording" ? (
                <>
                  <Pause className="size-4" /> Pause
                </>
              ) : (
                <>
                  <Play className="size-4" /> Resume
                </>
              )}
            </Button>
          </>
        )}



        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Sound</span>
          <div className="flex h-6 items-end gap-[3px]">
            {Array.from({ length: 14 }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "w-[3px] rounded-full transition-all duration-100",
                  level * 14 > i ? "bg-brand" : "bg-border",
                )}
                style={{ height: `${6 + (i % 5) * 3}px` }}
              />
            ))}
          </div>
          <span className="w-14 text-right font-mono text-sm tabular-nums">
            {formatDuration(elapsed)}
          </span>
        </div>
      </div>
    </section>
  );
}
