const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const https = require("node:https");
const fs = require("node:fs");
const path = require("node:path");

function createWindow() {
  const window = new BrowserWindow({
    width: 1080,
    height: 760,
    minWidth: 760,
    minHeight: 600,
    title: "ReleaseGuard",
    backgroundColor: "#f4f3ef",
    icon: path.join(__dirname, "assets", "releaseguard-mark.svg"),
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

ipcMain.handle("releaseguard:platform", () => ({ platform: process.platform, arch: process.arch }));

function downloadToFile(url, destination, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error("Too many download redirects."));
    const request = https.get(url, { headers: { "User-Agent": "ReleaseGuard/0.2.3" } }, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        return resolve(downloadToFile(new URL(response.headers.location, url).toString(), destination, redirects + 1));
      }
      if (response.statusCode !== 200) {
        response.resume();
        return reject(new Error(`Download failed (${response.statusCode ?? "unknown status"}).`));
      }
      const output = fs.createWriteStream(destination);
      response.pipe(output);
      output.on("finish", () => output.close(resolve));
      output.on("error", (error) => { output.destroy(); reject(error); });
      response.on("error", (error) => { output.destroy(); reject(error); });
    });
    request.on("error", reject);
  });
}

ipcMain.handle("releaseguard:download", async (event, { url, name }) => {
  const parsed = new URL(String(url));
  if (parsed.protocol !== "https:" || parsed.hostname !== "github.com" || !parsed.pathname.includes("/releases/download/")) {
    throw new Error("Only GitHub Release assets can be downloaded.");
  }
  const parent = BrowserWindow.fromWebContents(event.sender);
  const chosen = await dialog.showSaveDialog(parent, { defaultPath: String(name), title: "Save Release asset" });
  if (chosen.canceled || !chosen.filePath) return { canceled: true };
  await downloadToFile(parsed.toString(), chosen.filePath);
  return { canceled: false, filePath: chosen.filePath };
});

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
