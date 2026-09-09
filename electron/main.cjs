const path = require("path");
const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  nativeImage,
  ipcMain,
  desktopCapturer,
  globalShortcut,
  screen,
} = require("electron");

const APP_URL = process.env.APP_URL ||
  (app.isPackaged ? "https://screen-buddy-08.lovable.app" : "http://localhost:8080");

let mainWindow = null;
const overlayWindows = new Map();
let overlayPreview = true;
let overlaysHiddenByUser = false;
let latestOverlayUpdate = null;
let tray = null;
let recordingState = "idle";

const OVERLAY_W = 360;
const OVERLAY_H_SMALL = 84;
const OVERLAY_H_FULL = 276;

function overlayBounds(display) {
  const area = display.workArea;
  const height = overlayPreview ? OVERLAY_H_FULL : OVERLAY_H_SMALL;
  return {
    width: OVERLAY_W,
    height,
    x: area.x + area.width - OVERLAY_W - 24,
    y: area.y + area.height - height - 24,
  };
}

/** One always-on-top recording panel for each connected display. */
function createOverlay(display) {
  const displayId = String(display.id);
  const existing = overlayWindows.get(displayId);
  if (existing && !existing.isDestroyed()) return existing;
  const overlayWindow = new BrowserWindow({
    ...overlayBounds(display),
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    fullscreenable: false,
    show: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  overlayWindow.setAlwaysOnTop(true, "screen-saver");
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // Keep the floating controls out of the recording itself.
  try {
    overlayWindow.setContentProtection(true);
  } catch {
    /* not supported on this OS */
  }
  overlayWindow.loadURL(`${APP_URL.replace(/\/$/, "")}/overlay?display=${encodeURIComponent(displayId)}`);
  overlayWindow.webContents.on("did-finish-load", () => {
    if (latestOverlayUpdate && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send("overlay:data", latestOverlayUpdate);
    }
  });
  overlayWindow.on("closed", () => {
    overlayWindows.delete(displayId);
  });
  overlayWindows.set(displayId, overlayWindow);
  return overlayWindow;
}

function syncOverlays() {
  const displays = screen.getAllDisplays();
  const connectedIds = new Set(displays.map((display) => String(display.id)));

  for (const [displayId, win] of overlayWindows) {
    if (!connectedIds.has(displayId)) {
      if (!win.isDestroyed()) win.destroy();
      overlayWindows.delete(displayId);
    }
  }

  for (const display of displays) {
    const win = createOverlay(display);
    if (!win.isDestroyed()) win.setBounds(overlayBounds(display));
  }
}

function showOverlays() {
  overlaysHiddenByUser = false;
  syncOverlays();
  for (const win of overlayWindows.values()) {
    if (!win.isDestroyed() && !win.isVisible()) win.showInactive();
  }
}

function hideOverlays(hiddenByUser = false) {
  overlaysHiddenByUser = hiddenByUser;
  for (const win of overlayWindows.values()) {
    if (!win.isDestroyed()) win.hide();
  }
}


function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#FFFFFF",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(APP_URL);

  mainWindow.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function send(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
}

// ---- Global zoom: works while the user is in any other window ----
let zoomLevel = 1;
let followTimer = null;

/** Where the mouse is, as 0..1 inside the display it currently sits on. */
function cursorPoint() {
  try {
    const p = screen.getCursorScreenPoint();
    const b = screen.getDisplayNearestPoint(p).bounds;
    return {
      x: Math.min(1, Math.max(0, (p.x - b.x) / b.width)),
      y: Math.min(1, Math.max(0, (p.y - b.y) / b.height)),
    };
  } catch {
    return { x: 0.5, y: 0.5 };
  }
}

function pushZoom() {
  const point = cursorPoint();
  send("zoom:set", { zoom: zoomLevel, x: point.x, y: point.y });
  if (zoomLevel > 1 && !followTimer) {
    // Keep the zoom window glued to the mouse so the user can move around.
    followTimer = setInterval(() => {
      const p = cursorPoint();
      send("zoom:set", { zoom: zoomLevel, x: p.x, y: p.y });
    }, 120);
  }
  if (zoomLevel <= 1 && followTimer) {
    clearInterval(followTimer);
    followTimer = null;
  }
}

function registerShortcuts() {
  const bind = (accel, fn) => {
    try {
      globalShortcut.register(accel, fn);
    } catch {
      /* accelerator unavailable on this OS */
    }
  };
  const step = (factor) => {
    zoomLevel = Math.min(6, Math.max(1, zoomLevel * factor));
    pushZoom();
  };
  bind("CommandOrControl+Alt+=", () => step(1.4));
  bind("CommandOrControl+Alt+Plus", () => step(1.4));
  bind("CommandOrControl+Alt+numadd", () => step(1.4));
  bind("CommandOrControl+Alt+-", () => step(1 / 1.4));
  bind("CommandOrControl+Alt+numsub", () => step(1 / 1.4));
  bind("CommandOrControl+Alt+0", () => {
    zoomLevel = 1;
    pushZoom();
  });
  bind("CommandOrControl+Alt+num0", () => {
    zoomLevel = 1;
    pushZoom();
  });
  bind("CommandOrControl+Alt+R", () => send(recordingState === "idle" ? "tray:start" : "tray:stop"));
  bind("CommandOrControl+Alt+P", () => send("tray:toggle-pause"));
}

function buildTrayMenu() {
  const live = recordingState !== "idle";
  return Menu.buildFromTemplate([
    { label: live ? `Recording (${recordingState})` : "Idle", enabled: false },
    { type: "separator" },
    { label: "Start recording", enabled: !live, click: () => send("tray:start") },
    {
      label: recordingState === "paused" ? "Resume" : "Pause",
      enabled: live,
      click: () => send("tray:toggle-pause"),
    },
    { label: "Stop recording", enabled: live, click: () => send("tray:stop") },
    {
      label: "Show floating controls",
      enabled: live,
      click: () => showOverlays(),
    },
    { type: "separator" },
    {
      label: "Open Ashe",
      click: () => {
        if (!mainWindow) createWindow();
        mainWindow.show();
        mainWindow.focus();
      },
    },
    {
      label: "Quit",
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);
}

function createTray() {
  const icon = nativeImage.createFromDataURL(
    // 16x16 dot icon
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAWElEQVR4AWMYWuA/AwPDfwYGhv9EGvCfgYHhPwMDw38GBob/DAwM/xkYGP4zMDD8Z2Bg+M/AwPCfgYHhPwMDw38GBob/DAwM/xkYGP4zMDD8H1oAAJ0kD/2h1p1DAAAAAElFTkSuQmCC",
  );
  tray = new Tray(icon);
  tray.setToolTip("Ashe — screen recorder");
  tray.setContextMenu(buildTrayMenu());
  // On Windows a left click should reopen the window; on Mac it opens the menu.
  tray.on("click", () => {
    if (process.platform !== "win32") return;
    if (!mainWindow || mainWindow.isDestroyed()) createWindow();
    else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}


ipcMain.handle("capture:sources", async (_event, types) => {
  const sources = await desktopCapturer.getSources({
    types: types || ["screen", "window"],
    thumbnailSize: { width: 320, height: 180 },
  });
  return sources.map((s) => ({
    id: s.id,
    name: s.name,
    thumbnail: s.thumbnail.toDataURL(),
    isScreen: s.id.startsWith("screen"),
  }));
});

ipcMain.on("recorder:state", (_event, state) => {
  const previousState = recordingState;
  recordingState = state;
  if (state === "idle") {
    zoomLevel = 1;
    if (followTimer) {
      clearInterval(followTimer);
      followTimer = null;
    }
    hideOverlays(false);
  } else if (previousState === "idle") {
    showOverlays();
  } else if (!overlaysHiddenByUser) {
    showOverlays();
  }
  if (tray) {
    tray.setContextMenu(buildTrayMenu());
    tray.setToolTip(state === "idle" ? "Ashe — idle" : `Ashe — ${state}`);
  }
});

// Live status + mini preview frames travel main window -> overlay window.
ipcMain.on("overlay:update", (_event, payload) => {
  latestOverlayUpdate = payload;
  for (const win of overlayWindows.values()) {
    if (!win.isDestroyed() && win.isVisible() && !win.webContents.isLoading()) {
      win.webContents.send("overlay:data", payload);
    }
  }
});

ipcMain.on("overlay:command", (_event, command) => {
  if (command === "zoom-in") {
    zoomLevel = Math.min(6, zoomLevel * 1.4);
    pushZoom();
    return;
  }
  if (command === "zoom-out") {
    zoomLevel = Math.max(1, zoomLevel / 1.4);
    pushZoom();
    return;
  }
  if (command === "zoom-reset") {
    zoomLevel = 1;
    pushZoom();
    return;
  }
  if (command === "open") {
    if (!mainWindow || mainWindow.isDestroyed()) createWindow();
    else {
      mainWindow.show();
      mainWindow.focus();
    }
    return;
  }
  send(`tray:${command}`);
});

ipcMain.on("overlay:preview", (_event, visible) => {
  overlayPreview = Boolean(visible);
  syncOverlays();
});

ipcMain.on("overlay:hide", () => hideOverlays(true));
ipcMain.on("overlay:show", () => showOverlays());


app.whenReady().then(() => {
  createWindow();
  createTray();
  registerShortcuts();

  screen.on("display-added", () => {
    if (recordingState !== "idle" && !overlaysHiddenByUser) showOverlays();
  });
  screen.on("display-removed", () => syncOverlays());
  screen.on("display-metrics-changed", () => {
    if (recordingState !== "idle") syncOverlays();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow?.show();
  });
});

app.on("before-quit", () => {
  app.isQuitting = true;
  globalShortcut.unregisterAll();
  if (followTimer) clearInterval(followTimer);
});

app.on("window-all-closed", () => {
  // Keep running in the tray; quit only from the tray menu.
});
