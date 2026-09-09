import { Download, Film, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDuration, formatSize, type Recording } from "@/lib/recorder-types";

export function RecordingsList({
  recordings,
  onRemove,
}: {
  recordings: Recording[];
  onRemove: (id: string) => void;
}) {
  if (recordings.length === 0) {
    return (
      <div className="glass-panel flex flex-col items-center justify-center gap-2 p-8 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Film className="size-5" />
        </span>
        <p className="text-sm font-medium">No takes yet</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Your finished recordings appear here, ready to play back or save to your computer.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {recordings.map((rec) => (
        <article
          key={rec.id}
          className="glass-panel group overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lift"
        >
          <video
            src={rec.url}
            className="aspect-video w-full border-b border-border/60 bg-secondary object-cover"
            muted
            playsInline
            preload="metadata"
            controls
          />
          <div className="flex items-center gap-3 p-3.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{rec.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatDuration(rec.duration)} · {formatSize(rec.size)} · {rec.quality}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                asChild
                aria-label="Save recording"
                className="glass-button size-8 rounded-full"
              >
                <a href={rec.url} download={`${rec.name.replace(/[^\w\s-]/g, "")}.webm`}>
                  <Download className="size-4" />
                </a>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Delete recording"
                onClick={() => onRemove(rec.id)}
                className="glass-button size-8 rounded-full hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
