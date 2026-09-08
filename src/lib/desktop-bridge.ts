import { useEffect, useRef, useState } from "react";

type TrayCommand =
  | "start"
  | "stop"
  | "toggle-pause"
  | "zoom-in"
  | "zoom-out"
  | "zoom-reset";

export type OverlayUpdate = {
  status: "idle" | "recording" | "paused";
  elapsed: number;
  zoom: number;
  frame: string | null;
};

type DesktopBridge = {
  isDesktop: boolean;
  getSources: (
    types?: string[],
  ) => Promise<{ id: string; name: string; thumbnail: string; isScreen: boolean }[]>;
  setRecordingState: (state: string) => void;
  onTrayCommand: (handler: (cmd: TrayCommand) => void) => () => void;
  onZoomCommand?: (
    handler: (payload: { zoom: number; x: number; y: number }) => void,
  ) => () => void;
  sendOverlayUpdate?: (payload: OverlayUpdate) => void;
  onOverlayUpdate?: (handler: (payload: OverlayUpdate) => void) => () => void;
  sendOverlayCommand?: (command: TrayCommand | "open") => void;
  setOverlayPreview?: (visible: boolean) => void;
  hideOverlay?: () => void;
  showOverlay?: () => void;
};

export function isDesktopApp() {
  return bridge() !== null;
}

/** True once we know whether this is running inside the desktop app. */
export function useIsDesktopApp() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => setDesktop(isDesktopApp()), []);
  return desktop;
}

/** System-wide zoom: hotkeys fired from anywhere, anchored on the real mouse position. */
export function useDesktopZoom(onZoom: (zoom: number, focus: { x: number; y: number }) => void) {
  const handlerRef = useRef(onZoom);
  handlerRef.current = onZoom;

  useEffect(() => {
    const api = bridge();
    if (!api?.onZoomCommand) return;
    return api.onZoomCommand(({ zoom, x, y }) => handlerRef.current(zoom, { x, y }));
  }, []);
}

function bridge(): DesktopBridge | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { desktopBridge?: DesktopBridge }).desktopBridge ?? null;
}

/** Overlay window: receive live status + preview frames from the main window. */
export function useOverlayUpdates() {
  const [data, setData] = useState<OverlayUpdate>({
    status: "idle",
    elapsed: 0,
    zoom: 1,
    frame: null,
  });
  useEffect(() => {
    const api = bridge();
    if (!api?.onOverlayUpdate) return;
    return api.onOverlayUpdate(setData);
  }, []);
  return data;
}

export const overlayControls = {
  send(command: TrayCommand | "open") {
    bridge()?.sendOverlayCommand?.(command);
  },
  setPreview(visible: boolean) {
    bridge()?.setOverlayPreview?.(visible);
  },
  hide() {
    bridge()?.hideOverlay?.();
  },
  show() {
    bridge()?.showOverlay?.();
  },
};

/** Main window: stream small preview frames + status to the floating overlay. */
export function useOverlayBroadcast(state: {
  status: "idle" | "recording" | "paused";
  elapsed: number;
  zoom: number;
  stream: MediaStream | null;
}) {
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const api = bridge();
    if (!api?.sendOverlayUpdate) return;
    if (state.status === "idle" || !state.stream) return;

    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = new MediaStream(state.stream.getVideoTracks());
    void video.play().catch(() => {});

    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 180;
    const ctx = canvas.getContext("2d");

    const id = window.setInterval(() => {
      let frame: string | null = null;
      if (ctx && video.readyState >= 2 && video.videoWidth > 0) {
        const scale = Math.min(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
        const w = video.videoWidth * scale;
        const h = video.videoHeight * scale;
        ctx.fillStyle = "#0b1220";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
        frame = canvas.toDataURL("image/jpeg", 0.5);
      }
      const s = stateRef.current;
      api.sendOverlayUpdate?.({ status: s.status, elapsed: s.elapsed, zoom: s.zoom, frame });
    }, 200);

    return () => {
      window.clearInterval(id);
      video.srcObject = null;
    };
  }, [state.status, state.stream]);
}

/** Keeps the native system-tray menu in sync and reacts to its commands. */
export function useDesktopTray(
  status: "idle" | "recording" | "paused",
  actions: {
    start: () => void;
    stop: () => void;
    togglePause: () => void;
    nudgeZoom: (factor: number) => void;
    resetZoom: () => void;
  },
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
      const a = actionsRef.current;
      if (cmd === "start") a.start();
      if (cmd === "stop") a.stop();
      if (cmd === "toggle-pause") a.togglePause();
      if (cmd === "zoom-in") a.nudgeZoom(1.4);
      if (cmd === "zoom-out") a.nudgeZoom(1 / 1.4);
      if (cmd === "zoom-reset") a.resetZoom();
    });
  }, []);
}
