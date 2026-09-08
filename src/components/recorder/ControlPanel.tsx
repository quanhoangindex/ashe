import { Mic, MonitorSmartphone, MousePointer2, Volume2, AppWindow, Monitor } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  FRAME_RATES,
  QUALITY_PRESETS,
  type FrameRate,
  type RecorderSettings,
} from "@/lib/recorder-types";

type Props = {
  settings: RecorderSettings;
  onChange: (next: Partial<RecorderSettings>) => void;
  disabled: boolean;
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </p>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-surface px-3 py-2.5 transition-colors hover:border-brand/40 hover:bg-accent/60">
      <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

export function ControlPanel({ settings, onChange, disabled }: Props) {
  return (
    <aside className="glass-panel flex h-full flex-col gap-6 p-5">
      <div>
        <SectionTitle>Capture source</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { key: "screen", label: "Full screen", icon: Monitor },
              { key: "window", label: "A window", icon: AppWindow },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => onChange({ mode: key })}
              className={cn(
                "flex flex-col items-start gap-2 rounded-xl px-3 py-3 text-left disabled:opacity-50",
                settings.mode === key
                  ? "glass-outline-primary-active"
                  : "glass-outline-primary text-foreground",
              )}
            >
              <Icon className="size-4" />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          You'll confirm the exact screen or window in the system picker.
        </p>
      </div>

      <div>
        <SectionTitle>Inputs</SectionTitle>
        <div className="space-y-2">
          <ToggleRow
            icon={MousePointer2}
            label="Show cursor"
            description="Draw the mouse pointer into the video"
            checked={settings.cursor}
            onCheckedChange={(v) => onChange({ cursor: v })}
            disabled={disabled}
          />
          <ToggleRow
            icon={Volume2}
            label="System sound"
            description="Audio playing on this computer"
            checked={settings.systemAudio}
            onCheckedChange={(v) => onChange({ systemAudio: v })}
            disabled={disabled}
          />
          <ToggleRow
            icon={Mic}
            label="Microphone"
            description="Your voice, mixed with the capture"
            checked={settings.microphone}
            onCheckedChange={(v) => onChange({ microphone: v })}
            disabled={disabled}
          />
        </div>
      </div>

      <div>
        <SectionTitle>Quality</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {QUALITY_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              disabled={disabled}
              onClick={() => onChange({ quality: preset.key })}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-left transition-colors disabled:opacity-50",
                preset.key === "native" && "col-span-2",
                settings.quality === preset.key
                  ? "border-brand bg-accent text-accent-foreground"
                  : "border-border bg-surface hover:border-brand/40 hover:bg-accent",
              )}
            >
              <span className="block text-sm font-semibold">{preset.label}</span>
              <span className="block text-[11px] text-muted-foreground">{preset.hint}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Native records your screen at its true pixel size, so text stays readable when you zoom
          in. Picking more than your screen actually has can't add extra detail.
        </p>
      </div>

      <div>
        <SectionTitle>Frame rate</SectionTitle>
        <div className="flex gap-2">
          {FRAME_RATES.map((fps: FrameRate) => (
            <button
              key={fps}
              type="button"
              disabled={disabled}
              onClick={() => onChange({ fps })}
              className={cn(
                "flex-1 rounded-xl border py-2 text-sm font-medium transition-colors disabled:opacity-50",
                settings.fps === fps
                  ? "border-brand bg-accent text-accent-foreground"
                  : "border-border bg-surface hover:border-brand/40 hover:bg-accent",
              )}
            >
              {fps} fps
            </button>
          ))}
        </div>
      </div>

      <div className="mt-auto flex items-start gap-2 rounded-xl bg-surface p-3 text-xs text-muted-foreground">
        <MonitorSmartphone className="mt-0.5 size-4 shrink-0" />
        <p>
          Settings are locked while a recording is running. Stop the take to change them.
        </p>
      </div>
    </aside>
  );
}
