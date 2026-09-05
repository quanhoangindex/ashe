import { useEffect, useRef } from "react";
import { Circle, Pause, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/recorder-types";

type Props = {
  stream: MediaStream | null;
  status: "idle" | "recording" | "paused";
  elapsed: number;
  level: number;
  onStart: () => void;
  onStop: () => void;
  onTogglePause: () => void;
};

export function StageView({
  stream,
  status,
  elapsed,
  level,
  onStart,
  onStop,
  onTogglePause,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  const live = status !== "idle";

  return (
    <section className="panel overflow-hidden">
      <div className="relative aspect-video w-full bg-primary">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={cn("size-full object-contain", live ? "opacity-100" : "opacity-0")}
        />
        {!live && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-grain">
            <span className="text-display text-4xl text-primary-foreground">Ready when you are</span>
            <p className="max-w-sm text-center text-sm text-primary-foreground/70">
              Pick what to capture on the left, then hit record. A live preview shows up here.
            </p>
          </div>
        )}
        {live && (
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-card/90 px-3 py-1.5 text-xs font-semibold shadow-soft backdrop-blur">
            <Circle
              className={cn(
                "size-2.5 fill-current text-live",
                status === "recording" && "pulse-live",
              )}
            />
            {status === "recording" ? "Recording" : "Paused"} · {formatDuration(elapsed)}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border p-4">
        {status === "idle" ? (
          <Button size="lg" onClick={onStart} className="gap-2">
            <Circle className="size-3.5 fill-current" />
            Start recording
          </Button>
        ) : (
          <>
            <Button size="lg" variant="destructive" onClick={onStop} className="gap-2">
              <Square className="size-3.5 fill-current" />
              Stop
            </Button>
            <Button size="lg" variant="secondary" onClick={onTogglePause} className="gap-2">
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
