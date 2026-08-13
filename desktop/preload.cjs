const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("releaseguard", {
  scan: (target) => ipcRenderer.invoke("releaseguard:scan", target),
  open: (url) => ipcRenderer.invoke("releaseguard:open", url),
  platform: () => ipcRenderer.invoke("releaseguard:platform"),
  download: (url, name) => ipcRenderer.invoke("releaseguard:download", { url, name }),
});
