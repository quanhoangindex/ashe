import { createFileRoute } from "@tanstack/react-router";
import { Circle, Film } from "lucide-react";
import { cn } from "@/lib/utils";
import { RecordingsList } from "@/components/recorder/RecordingsList";
import { StageView } from "@/components/recorder/StageView";
import { useRecorderContext } from "@/lib/recorder-provider";
import { QUALITY_PRESETS } from "@/lib/recorder-types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Reel — Screen Recorder for Desktop" },
      {
        name: "description",
        content:
          "Record your full screen or a single window with cursor, system sound and microphone, zoom while recording, and control everything from the tray dock.",
      },
      { property: "og:title", content: "Reel — Screen Recorder for Desktop" },
      {
        property: "og:description",
        content:
          "A focused recording stage: hit record, zoom in live, and find every take right below.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const recorder = useRecorderContext();
  const { settings } = recorder;
  const preset = QUALITY_PRESETS.find((p) => p.key === settings.quality);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 pb-32 sm:px-6 sm:py-8">
        <StageView
          zoom={recorder.zoom}
          onZoom={recorder.setZoom}
          onResetZoom={recorder.resetZoom}
          captureInfo={recorder.captureInfo}
          stream={recorder.stream}
          status={recorder.status}
          elapsed={recorder.elapsed}
          level={recorder.level}
          onStart={recorder.start}
          onStop={recorder.stop}
          onTogglePause={recorder.togglePause}
        />

        <div className="glass-panel flex items-center gap-3 px-4 py-3">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl",
              recorder.status === "recording"
                ? "bg-live/10 text-live"
                : "bg-brand/10 text-brand",
            )}
          >
            <Circle
              className={cn(
                "size-2 fill-current",
                recorder.status === "recording" && "pulse-live",
              )}
            />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">
              {recorder.status === "recording"
                ? "Recording…"
                : recorder.status === "paused"
                  ? "Paused"
                  : "Ready to record"}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {settings.mode === "screen" ? "Full screen" : "A window"} · {preset?.label} ·{" "}
              {settings.fps} fps · {settings.cursor ? "cursor on" : "cursor off"}
            </span>
          </span>
        </div>

        {recorder.error && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {recorder.error}
          </p>
        )}

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <Film className="size-4" /> Your takes
          </h2>
          <RecordingsList recordings={recorder.recordings} onRemove={recorder.remove} />
        </section>
      </main>
    </div>
  );
}
