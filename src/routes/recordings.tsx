import { createFileRoute } from "@tanstack/react-router";
import { Film } from "lucide-react";
import { RecordingsList } from "@/components/recorder/RecordingsList";
import { useRecorderContext } from "@/lib/recorder-provider";

export const Route = createFileRoute("/recordings")({
  head: () => ({
    meta: [
      { title: "Your takes — Ashe" },
      {
        name: "description",
        content:
          "Browse every Ashe recording, play them back, or save them to your computer.",
      },
      { property: "og:title", content: "Your takes — Ashe" },
      {
        property: "og:description",
        content:
          "Browse every Ashe recording, play them back, or save them to your computer.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RecordingsPage,
});

function RecordingsPage() {
  const recorder = useRecorderContext();

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6 pb-32 sm:px-6 sm:py-8">
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
