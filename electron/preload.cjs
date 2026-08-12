const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  electronVersion: process.versions.electron,
  getUpdateDebugHistory: () => ipcRenderer.invoke('electron-update-debug-history'),
  setRecentContacts: (contacts) => {
    if (!Array.isArray(contacts)) return;
    ipcRenderer.send('electron-recent-contacts', contacts.slice(0, 2));
  },
  onUpdateStatus: (listener) => {
    if (typeof listener !== 'function') return () => {};

    const handler = (_event, status) => listener(status);
    ipcRenderer.on('electron-update-status', handler);
    return () => ipcRenderer.removeListener('electron-update-status', handler);
  },
  onUpdateDebug: (listener) => {
    if (typeof listener !== 'function') return () => {};

    const handler = (_event, entry) => listener(entry);
    ipcRenderer.on('electron-update-debug', handler);
    return () => ipcRenderer.removeListener('electron-update-debug', handler);
  },
});
