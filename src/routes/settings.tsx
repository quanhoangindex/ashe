import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Keyboard } from "lucide-react";
import { ControlPanel } from "@/components/recorder/ControlPanel";
import { useRecorderContext } from "@/lib/recorder-provider";
import { modifierLabel } from "@/lib/platform";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Recording Settings — Ashe Screen Recorder" },
      {
        name: "description",
        content:
          "Choose full screen or a single window, show the cursor, capture system sound and microphone, and set quality and frame rate for your recordings.",
      },
      { property: "og:title", content: "Recording Settings — Ashe Screen Recorder" },
      {
        property: "og:description",
        content:
          "Capture source, cursor, sound, quality preset and frame rate — everything Ashe uses for your next take.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { settings, update, status } = useRecorderContext();
  const live = status !== "idle";

  return (
    <div className="min-h-screen bg-background bg-grain">
      <main className="mx-auto max-w-2xl px-4 py-8 pb-32 sm:px-6">
        <Link
          to="/"
          className="glass-interactive mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground"
        >
          <ArrowLeft className="size-4" /> Back to recording
        </Link>

        <h2 className="text-display mb-1 text-3xl">Settings</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          These choices are remembered on this computer and used for your next take.
        </p>

        <ControlPanel settings={settings} onChange={update} disabled={live} />

        <div className="glass-panel mt-6 flex items-start gap-3 p-4 text-xs text-muted-foreground">
          <Keyboard className="mt-0.5 size-4 shrink-0" />
          <p>
            Zoom while recording with {modifierLabel()} + <kbd>=</kbd> / <kbd>−</kbd> /{" "}
            <kbd>0</kbd>, or use the zoom buttons in the tray dock.
          </p>
        </div>
      </main>
    </div>
  );
}
