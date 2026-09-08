const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopBridge", {
  isDesktop: true,
  getSources: (types) => ipcRenderer.invoke("capture:sources", types),
  setRecordingState: (state) => ipcRenderer.send("recorder:state", state),
  onZoomCommand: (handler) => {
    const fn = (_e, payload) => handler(payload);
    ipcRenderer.on("zoom:set", fn);
    return () => ipcRenderer.off("zoom:set", fn);
  },
  onTrayCommand: (handler) => {
    const map = {
      "tray:start": () => handler("start"),
      "tray:stop": () => handler("stop"),
      "tray:toggle-pause": () => handler("toggle-pause"),
      "tray:zoom-in": () => handler("zoom-in"),
      "tray:zoom-out": () => handler("zoom-out"),
      "tray:zoom-reset": () => handler("zoom-reset"),
    };
    Object.entries(map).forEach(([channel, fn]) => ipcRenderer.on(channel, fn));
    return () => Object.entries(map).forEach(([channel, fn]) => ipcRenderer.off(channel, fn));
  },

  // ---- Floating overlay (small always-on-top window) ----
  /** Main window pushes live status + a small preview frame. */
  sendOverlayUpdate: (payload) => ipcRenderer.send("overlay:update", payload),
  /** Overlay window listens for those updates. */
  onOverlayUpdate: (handler) => {
    const fn = (_e, payload) => handler(payload);
    ipcRenderer.on("overlay:data", fn);
    return () => ipcRenderer.off("overlay:data", fn);
  },
  /** Overlay window asks the main window to do something. */
  sendOverlayCommand: (command) => ipcRenderer.send("overlay:command", command),
  /** Show / hide the mini preview (resizes the floating window). */
  setOverlayPreview: (visible) => ipcRenderer.send("overlay:preview", visible),
  hideOverlay: () => ipcRenderer.send("overlay:hide"),
  showOverlay: () => ipcRenderer.send("overlay:show"),
});
