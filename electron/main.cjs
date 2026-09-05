const path = require("path");
const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  nativeImage,
  ipcMain,
  desktopCapturer,
} = require("electron");

const APP_URL = process.env.APP_URL || "http://localhost:8080";

let mainWindow = null;
let tray = null;
let recordingState = "idle";

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#FBF9F4",
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

function send(channel) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel);
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
    { type: "separator" },
    {
      label: "Open Reel",
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
  tray.setToolTip("Reel — screen recorder");
  tray.setContextMenu(buildTrayMenu());
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
  recordingState = state;
  if (tray) {
    tray.setContextMenu(buildTrayMenu());
    tray.setToolTip(state === "idle" ? "Reel — idle" : `Reel — ${state}`);
  }
});

app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow?.show();
  });
});

app.on("before-quit", () => {
  app.isQuitting = true;
});

app.on("window-all-closed", () => {
  // Keep running in the tray; quit only from the tray menu.
});
