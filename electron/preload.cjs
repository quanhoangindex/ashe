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
    };
    Object.entries(map).forEach(([channel, fn]) => ipcRenderer.on(channel, fn));
    return () => Object.entries(map).forEach(([channel, fn]) => ipcRenderer.off(channel, fn));
  },
});
