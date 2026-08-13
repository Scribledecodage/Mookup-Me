const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  electronVersion: process.versions.electron,
  getAppInfo: () => ipcRenderer.invoke('electron-app-info'),
  getUpdateDebugHistory: () => ipcRenderer.invoke('electron-update-debug-history'),
  getSystemActivity: () => ipcRenderer.invoke('electron-system-activity-current'),
  approveSystemActivity: (appId) => {
    if (typeof appId !== 'string') return;
    ipcRenderer.send('electron-system-activity-approve', appId);
  },
  dismissSystemActivity: (appId) => {
    if (typeof appId !== 'string') return;
    ipcRenderer.send('electron-system-activity-dismiss', appId);
  },
  setSystemActivityPromptEnabled: (enabled) => {
    ipcRenderer.send('electron-system-activity-prompt-preference', enabled === true);
  },
  setRecentContacts: (contacts) => {
    if (!Array.isArray(contacts)) return;
    ipcRenderer.send('electron-recent-contacts', contacts.slice(0, 2));
  },
  onSystemActivity: (listener) => {
    if (typeof listener !== 'function') return () => {};

    const handler = (_event, activity) => listener(activity);
    ipcRenderer.on('electron-system-activity', handler);
    return () => ipcRenderer.removeListener('electron-system-activity', handler);
  },
  onSystemActivityDebug: (listener) => {
    if (typeof listener !== 'function') return () => {};

    const handler = (_event, entry) => listener(entry);
    ipcRenderer.on('electron-system-activity-debug', handler);
    return () => ipcRenderer.removeListener('electron-system-activity-debug', handler);
  },
  onSystemActivityApproved: (listener) => {
    if (typeof listener !== 'function') return () => {};

    const handler = (_event, activity) => listener(activity);
    ipcRenderer.on('electron-system-activity-approved', handler);
    return () => ipcRenderer.removeListener('electron-system-activity-approved', handler);
  },
  onSystemActivityDismissed: (listener) => {
    if (typeof listener !== 'function') return () => {};

    const handler = (_event, activity) => listener(activity);
    ipcRenderer.on('electron-system-activity-dismissed', handler);
    return () => ipcRenderer.removeListener('electron-system-activity-dismissed', handler);
  },
  onUpdateStatus: (listener) => {
    if (typeof listener !== 'function') return () => {};

    const handler = (_event, status) => listener(status);
    ipcRenderer.on('electron-update-status', handler);
    return () => ipcRenderer.removeListener('electron-update-status', handler);
  },
  onAboutRequested: (listener) => {
    if (typeof listener !== 'function') return () => {};

    const handler = () => listener();
    ipcRenderer.on('electron-about-requested', handler);
    return () => ipcRenderer.removeListener('electron-about-requested', handler);
  },
  onUpdateDebug: (listener) => {
    if (typeof listener !== 'function') return () => {};

    const handler = (_event, entry) => listener(entry);
    ipcRenderer.on('electron-update-debug', handler);
    return () => ipcRenderer.removeListener('electron-update-debug', handler);
  },
});
