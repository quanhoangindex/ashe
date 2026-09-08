import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRecorder } from "@/lib/use-recorder";
import { useDesktopTray, useDesktopZoom } from "@/lib/desktop-bridge";
import type { RecorderSettings } from "@/lib/recorder-types";

const DEFAULT_SETTINGS: RecorderSettings = {
  mode: "screen",
  quality: "1080p",
  fps: 30,
  cursor: true,
  systemAudio: true,
  microphone: false,
};

const STORAGE_KEY = "reel:settings";

type RecorderContextValue = ReturnType<typeof useRecorder> & {
  settings: RecorderSettings;
  update: (next: Partial<RecorderSettings>) => void;
};

const RecorderContext = createContext<RecorderContextValue | null>(null);

export function useRecorderContext() {
  const ctx = useContext(RecorderContext);
  if (!ctx) throw new Error("useRecorderContext must be used inside <RecorderProvider>");
  return ctx;
}

/**
 * Holds the recorder for the whole app so a recording keeps running while the
 * user moves between the stage and the settings page. Settings are remembered
 * on this computer.
 */
export function RecorderProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<RecorderSettings>(DEFAULT_SETTINGS);
  const recorder = useRecorder(settings);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setSettings((prev) => ({ ...prev, ...JSON.parse(raw) }));
    } catch {
      /* stored settings unreadable — keep defaults */
    }
  }, []);

  const update = useCallback((next: Partial<RecorderSettings>) => {
    setSettings((prev) => {
      const merged = { ...prev, ...next };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch {
        /* storage unavailable — settings just won't persist */
      }
      return merged;
    });
  }, []);

  useDesktopTray(recorder.status, {
    start: recorder.start,
    stop: recorder.stop,
    togglePause: recorder.togglePause,
  });

  useDesktopZoom(recorder.setZoom);

  // Same hotkeys inside the app window, so zoom works without the desktop build too.
  // Matched on the physical key (e.code) because Alt/AltGr changes e.key on Mac and
  // on non-US layouts ("≠", "–", "}" …), which is why key-based matching never fired.
  const recorderRef = useRef(recorder);
  recorderRef.current = recorder;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || !e.altKey) return;
      const code = e.code;
      const key = e.key;
      const zoomIn = code === "Equal" || code === "NumpadAdd" || key === "=" || key === "+";
      const zoomOut = code === "Minus" || code === "NumpadSubtract" || key === "-" || key === "_";
      const reset = code === "Digit0" || code === "Numpad0" || key === "0";
      if (zoomIn) {
        e.preventDefault();
        recorderRef.current.nudgeZoom(1.4);
      } else if (zoomOut) {
        e.preventDefault();
        recorderRef.current.nudgeZoom(1 / 1.4);
      } else if (reset) {
        e.preventDefault();
        recorderRef.current.resetZoom();
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, []);

  return (
    <RecorderContext.Provider value={{ ...recorder, settings, update }}>
      {children}
    </RecorderContext.Provider>
  );
}
