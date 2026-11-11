const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ds', {
  platform: process.platform,
  disk: () => ipcRenderer.invoke('disk'),
  scan: () => ipcRenderer.invoke('scan'),
  clean: (paths) => ipcRenderer.invoke('clean', paths),
  picture: (p, kind) => ipcRenderer.invoke('picture', p, kind),
  reveal: (p) => ipcRenderer.invoke('reveal', p),
  openTrash: () => ipcRenderer.invoke('open-trash'),
  steamUninstall: (id) => ipcRenderer.invoke('steam-uninstall', id),
  epicOpen: () => ipcRenderer.invoke('epic-open'),
  onScan: (fn) => ipcRenderer.on('scan-progress', (_, p) => fn(p)),
  onClean: (fn) => ipcRenderer.on('clean-progress', (_, p) => fn(p)),
});
