import { useCallback, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Circle, Minus, Radio, Settings2 } from "lucide-react";
import { ControlPanel } from "@/components/recorder/ControlPanel";
import { RecordingsList } from "@/components/recorder/RecordingsList";
import { StageView } from "@/components/recorder/StageView";
import { useRecorder } from "@/lib/use-recorder";
import { useDesktopTray } from "@/lib/desktop-bridge";
import { formatDuration, type RecorderSettings } from "@/lib/recorder-types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Reel — Screen Recorder for Desktop" },
      {
        name: "description",
        content:
          "Record your full screen or a single window with cursor, system sound and microphone, quality presets and a system tray control panel.",
      },
      { property: "og:title", content: "Reel — Screen Recorder for Desktop" },
      {
        property: "og:description",
        content:
          "Capture full screen or a window, toggle cursor and sound, pick a quality preset, and control everything from the tray.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const DEFAULT_SETTINGS: RecorderSettings = {
  mode: "screen",
  quality: "1080p",
  fps: 30,
  cursor: true,
  systemAudio: true,
  microphone: false,
};

function Index() {
  const [settings, setSettings] = useState<RecorderSettings>(DEFAULT_SETTINGS);
  const [trayCollapsed, setTrayCollapsed] = useState(false);
  const recorder = useRecorder(settings);

  useDesktopTray(recorder.status, {
    start: recorder.start,
    stop: recorder.stop,
    togglePause: recorder.togglePause,
  });

  const update = useCallback(
    (next: Partial<RecorderSettings>) => setSettings((prev) => ({ ...prev, ...next })),
    [],
  );

  const live = recorder.status !== "idle";

  return (
    <div className="min-h-screen bg-background bg-grain">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4">
          <span className="flex size-9 items-center justify-center rounded-xl bg-brand text-brand-foreground">
            <Radio className="size-4" />
          </span>
          <div>
            <h1 className="text-lg font-semibold leading-none">Reel</h1>
            <p className="text-xs text-muted-foreground">Desktop screen recorder</p>
          </div>
          <div
            className={cn(
              "ml-auto flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium",
              live ? "border-live/40 bg-accent text-accent-foreground" : "border-border bg-surface",
            )}
          >
            <Circle
              className={cn(
                "size-2 fill-current",
                live ? "text-live pulse-live" : "text-muted-foreground",
              )}
            />
            {live ? `Live · ${formatDuration(recorder.elapsed)}` : "Idle"}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[320px_1fr]">
        <ControlPanel settings={settings} onChange={update} disabled={live} />

        <div className="space-y-6">
          <StageView
            stream={recorder.stream}
            status={recorder.status}
            elapsed={recorder.elapsed}
            level={recorder.level}
            onStart={recorder.start}
            onStop={recorder.stop}
            onTogglePause={recorder.togglePause}
          />

          {recorder.error && (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {recorder.error}
            </p>
          )}

          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <Settings2 className="size-4" /> Your takes
            </h2>
            <RecordingsList recordings={recorder.recordings} onRemove={recorder.remove} />
          </section>
        </div>
      </main>

      {/* Floating tray-style mini control, mirrors the system tray menu */}
      <div className="fixed bottom-5 right-5 z-30">
        {trayCollapsed ? (
          <button
            type="button"
            onClick={() => setTrayCollapsed(false)}
            className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lift"
            aria-label="Open tray controls"
          >
            <Radio className="size-5" />
          </button>
        ) : (
          <div className="panel flex items-center gap-3 px-4 py-3 shadow-lift">
            <Circle
              className={cn(
                "size-2.5 fill-current",
                live ? "text-live pulse-live" : "text-muted-foreground",
              )}
            />
            <div className="mr-2">
              <p className="text-xs font-semibold leading-tight">Tray controls</p>
              <p className="font-mono text-xs text-muted-foreground tabular-nums">
                {formatDuration(recorder.elapsed)}
              </p>
            </div>
            {live ? (
              <>
                <button
                  type="button"
                  onClick={recorder.togglePause}
                  className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  {recorder.status === "recording" ? "Pause" : "Resume"}
                </button>
                <button
                  type="button"
                  onClick={recorder.stop}
                  className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:opacity-90"
                >
                  Stop
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={recorder.start}
                className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground hover:opacity-90"
              >
                Record
              </button>
            )}
            <button
              type="button"
              onClick={() => setTrayCollapsed(true)}
              className="ml-1 text-muted-foreground hover:text-foreground"
              aria-label="Collapse tray controls"
            >
              <Minus className="size-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
