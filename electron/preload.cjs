const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  electronVersion: process.versions.electron,
  getAppInfo: () => ipcRenderer.invoke('electron-app-info'),
  minimizeWindow: () => ipcRenderer.send('electron-window-minimize'),
  toggleMaximizeWindow: () => ipcRenderer.send('electron-window-toggle-maximize'),
  closeWindow: () => ipcRenderer.send('electron-window-close'),
  setUnreadCount: (count, imageDataUrl) => {
    if (typeof count !== 'number' || !Number.isFinite(count) || count <= 0) return;
    if (typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/png')) return;
    ipcRenderer.send('electron-unread-count', Math.floor(count), imageDataUrl);
  },
  clearUnreadCount: () => {
    ipcRenderer.send('electron-unread-clear');
  },
  showNativeMessageNotification: (notification) => {
    if (!notification || typeof notification !== 'object') return;
    ipcRenderer.send('electron-native-message-notification', notification);
  },
  onNotificationClicked: (listener) => {
    if (typeof listener !== 'function') return () => {};

    const handler = (_event, data) => listener(data);
    ipcRenderer.on('electron-notification-clicked', handler);
    return () => ipcRenderer.removeListener('electron-notification-clicked', handler);
  },
  isWindowMaximized: () => ipcRenderer.invoke('electron-window-is-maximized'),
  isWindowFocused: () => ipcRenderer.invoke('electron-window-is-focused'),
  requestAbout: () => ipcRenderer.send('electron-about-request'),
  onWindowStateChanged: (listener) => {
    if (typeof listener !== 'function') return () => {};

    const handler = (_event, maximized) => listener(maximized === true);
    ipcRenderer.on('electron-window-state-changed', handler);
    return () => ipcRenderer.removeListener('electron-window-state-changed', handler);
  },
  onWindowFocusChanged: (listener) => {
    if (typeof listener !== 'function') return () => {};

    const handler = (_event, focused) => listener(focused === true);
    ipcRenderer.on('electron-window-focus-changed', handler);
    return () => ipcRenderer.removeListener('electron-window-focus-changed', handler);
  },
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
