import { createFileRoute } from "@tanstack/react-router";
import { StageView } from "@/components/recorder/StageView";
import { useRecorderContext } from "@/lib/recorder-provider";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ashe — Screen Recorder for Desktop" },
      {
        name: "description",
        content:
          "Record your full screen or a single window with cursor, system sound and microphone, zoom while recording, and control everything from the tray dock.",
      },
      { property: "og:title", content: "Ashe — Screen Recorder for Desktop" },
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

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6 pb-32 sm:px-6 sm:py-8">
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


        {recorder.error && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {recorder.error}
          </p>
        )}
      </main>
    </div>
  );
}
