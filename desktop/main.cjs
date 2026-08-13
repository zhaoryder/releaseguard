const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("node:path");

function createWindow() {
  const window = new BrowserWindow({
    width: 1080,
    height: 760,
    minWidth: 760,
    minHeight: 600,
    title: "ReleaseGuard",
    backgroundColor: "#0b1020",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.loadFile(path.join(__dirname, "index.html"));
}

ipcMain.handle("releaseguard:scan", async (_event, target) => {
  const [{ fetchRelease }, { analyze }, { defaultPolicy }] = await Promise.all([
    import("../dist/github.js"),
    import("../dist/analyze.js"),
    import("../dist/policy.js"),
  ]);
  const release = await fetchRelease(String(target).trim());
  return analyze(release, defaultPolicy);
});

ipcMain.handle("releaseguard:open", (_event, url) => {
  const value = String(url);
  if (value.startsWith("https://github.com/")) return shell.openExternal(value);
});

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
