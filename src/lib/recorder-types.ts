export type CaptureMode = "screen" | "window";

export type QualityKey = "720p" | "1080p" | "1440p" | "4k";

export type QualityPreset = {
  key: QualityKey;
  label: string;
  hint: string;
  width: number;
  height: number;
  bitrate: number;
};

export const QUALITY_PRESETS: QualityPreset[] = [
  { key: "720p", label: "720p", hint: "Light · 2.5 Mbps", width: 1280, height: 720, bitrate: 2_500_000 },
  { key: "1080p", label: "1080p", hint: "Balanced · 6 Mbps", width: 1920, height: 1080, bitrate: 6_000_000 },
  { key: "1440p", label: "1440p", hint: "Sharp · 12 Mbps", width: 2560, height: 1440, bitrate: 12_000_000 },
  { key: "4k", label: "4K", hint: "Max · 28 Mbps", width: 3840, height: 2160, bitrate: 28_000_000 },
];

export const FRAME_RATES = [24, 30, 60] as const;
export type FrameRate = (typeof FRAME_RATES)[number];

export type RecorderSettings = {
  mode: CaptureMode;
  quality: QualityKey;
  fps: FrameRate;
  cursor: boolean;
  systemAudio: boolean;
  microphone: boolean;
};

export type Recording = {
  id: string;
  name: string;
  url: string;
  size: number;
  duration: number;
  createdAt: number;
  quality: QualityKey;
};

export function formatDuration(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[i]}`;
}
