import { createFileRoute, Link } from "@tanstack/react-router";
import { Film, SlidersHorizontal } from "lucide-react";
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
    <div className="min-h-screen bg-background bg-grain">
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

        <Link
          to="/settings"
          className="glass-panel glass-interactive flex items-center gap-3 px-4 py-3 text-left"
        >
          <span className="glass-button flex size-9 shrink-0 items-center justify-center rounded-xl">
            <SlidersHorizontal className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">Recording settings</span>
            <span className="block truncate text-xs text-muted-foreground">
              {settings.mode === "screen" ? "Full screen" : "A window"} · {preset?.label} ·{" "}
              {settings.fps} fps · {settings.cursor ? "cursor on" : "cursor off"}
            </span>
          </span>
          <span className="text-xs font-medium text-muted-foreground">Change</span>
        </Link>

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
