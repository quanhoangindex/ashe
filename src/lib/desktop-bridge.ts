import { useEffect, useRef } from "react";

type TrayCommand = "start" | "stop" | "toggle-pause";

type DesktopBridge = {
  isDesktop: boolean;
  getSources: (
    types?: string[],
  ) => Promise<{ id: string; name: string; thumbnail: string; isScreen: boolean }[]>;
  setRecordingState: (state: string) => void;
  onTrayCommand: (handler: (cmd: TrayCommand) => void) => () => void;
};

function bridge(): DesktopBridge | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { desktopBridge?: DesktopBridge }).desktopBridge ?? null;
}

/** Keeps the native system-tray menu in sync and reacts to its commands. */
export function useDesktopTray(
  status: "idle" | "recording" | "paused",
  actions: { start: () => void; stop: () => void; togglePause: () => void },
) {
  useEffect(() => {
    bridge()?.setRecordingState(status);
  }, [status]);

  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  useEffect(() => {
    const api = bridge();
    if (!api) return;
    return api.onTrayCommand((cmd) => {
      if (cmd === "start") actionsRef.current.start();
      if (cmd === "stop") actionsRef.current.stop();
      if (cmd === "toggle-pause") actionsRef.current.togglePause();
    });
  }, []);
}
