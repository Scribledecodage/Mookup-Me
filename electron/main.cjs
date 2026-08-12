const { app, BrowserWindow, session, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('node:path');

const APP_ID = 'com.mookup.app';
const DEFAULT_PRODUCTION_URL = 'https://mookup-me.vercel.app';
const isDevelopment = process.argv.includes('--dev') || !app.isPackaged;
const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;
const UPDATE_INSTALL_DELAY_MS = 5000;

// Le mode dev et le mode production ne doivent pas partager le verrou Electron.
// Sinon `npm run electron` se ferme silencieusement si `electron:dev` tourne encore.
app.setPath('userData', path.join(app.getPath('appData'), isDevelopment ? 'Mookup-dev' : 'Mookup'));

const PRODUCTION_URL = process.env.MOOKUP_APP_URL?.trim() || DEFAULT_PRODUCTION_URL;
const startUrl = process.env.MOOKUP_ELECTRON_URL?.trim()
  || (isDevelopment ? 'http://localhost:3000' : PRODUCTION_URL);

let mainWindow = null;
let updateCheckTimer = null;
let updateInstallTimer = null;
let isInstallingUpdate = false;
let isQuitting = false;

function getAllowedOrigin() {
  try {
    return new URL(startUrl).origin;
  } catch {
    return new URL(PRODUCTION_URL).origin;
  }
}

function isAllowedUrl(targetUrl) {
  try {
    return new URL(targetUrl).origin === getAllowedOrigin();
  } catch {
    return false;
  }
}

function sendUpdateStatus(status, details = {}) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('electron-update-status', {
    status,
    ...details,
  });
}

function setUpdateTitle(title) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setTitle(title);
}

function configureAutoUpdater() {
  // electron-updater ne fonctionne qu'avec une application empaquetée.
  // Le flag permet de tester le reste de l'application sans contacter GitHub.
  if (isDevelopment || process.env.MOOKUP_DISABLE_AUTO_UPDATE === '1') return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = process.env.MOOKUP_ALLOW_PRERELEASE === '1';
  autoUpdater.fullChangelog = true;
  autoUpdater.logger = {
    info: (message) => console.info('[Auto-update]', message),
    warn: (message) => console.warn('[Auto-update]', message),
    error: (message) => console.error('[Auto-update]', message),
    debug: (message) => console.debug('[Auto-update]', message),
  };

  autoUpdater.on('checking-for-update', () => {
    sendUpdateStatus('checking');
  });

  autoUpdater.on('update-available', (info) => {
    setUpdateTitle(`Mookup — téléchargement de la mise à jour ${info.version}`);
    sendUpdateStatus('available', { version: info.version });
  });

  autoUpdater.on('update-not-available', (info) => {
    setUpdateTitle('Mookup');
    sendUpdateStatus('up-to-date', { version: info.version });
  });

  autoUpdater.on('download-progress', (progress) => {
    const percent = Math.round(progress.percent * 10) / 10;
    setUpdateTitle(`Mookup — mise à jour ${percent}%`);
    sendUpdateStatus('downloading', {
      percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    setUpdateTitle(`Mookup — redémarrage pour la version ${info.version}`);
    sendUpdateStatus('downloaded', { version: info.version });

    // Installation immédiate : les données de l'utilisateur sont dans le site
    // distant, et autoInstallOnAppQuit couvre aussi une fermeture manuelle.
    updateInstallTimer = setTimeout(() => {
      if (isInstallingUpdate || isQuitting) return;
      isInstallingUpdate = true;
      autoUpdater.quitAndInstall(false, true);
    }, UPDATE_INSTALL_DELAY_MS);
  });

  autoUpdater.on('error', (error) => {
    console.error('[Auto-update] Échec:', error);
    setUpdateTitle('Mookup');
    sendUpdateStatus('error', { message: error.message });
  });

  const checkForUpdates = async () => {
    if (isInstallingUpdate || !app.isPackaged) return;
    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      console.error('[Auto-update] Vérification impossible:', error.message);
    }
  };

  // Laisser la fenêtre démarrer avant le premier accès réseau.
  setTimeout(() => void checkForUpdates(), 8000);
  updateCheckTimer = setInterval(() => void checkForUpdates(), UPDATE_CHECK_INTERVAL_MS);
}

function configureSessionPermissions() {
  const allowedPermissions = new Set([
    'media',
    'notifications',
    'clipboard-read',
    'clipboard-sanitized-write',
  ]);

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const requestingUrl = webContents.getURL();
    callback(isAllowedUrl(requestingUrl) && allowedPermissions.has(permission));
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    const origin = requestingOrigin || webContents?.getURL() || '';
    return isAllowedUrl(origin) && allowedPermissions.has(permission);
  });
}

function createMainWindow() {
  const iconPath = app.isPackaged
    ? path.join(__dirname, 'public', 'Logo.png')
    : path.join(__dirname, '..', 'public', 'Logo.png');

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    show: false,
    frame: true,
    resizable: true,
    thickFrame: true,
    titleBarStyle: 'default',
    title: 'Mookup',
    icon: iconPath,
    backgroundColor: '#111318',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
      // Les DevTools restent disponibles en production via Ctrl+Shift+I.
      devTools: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (
      input.type === 'keyDown'
      && !input.isAutoRepeat
      && input.control
      && input.shift
      && input.key.toLowerCase() === 'i'
    ) {
      event.preventDefault();
      mainWindow?.webContents.toggleDevTools();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!isAllowedUrl(url)) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedUrl(url)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`Impossible de charger Mookup (${errorCode}: ${errorDescription}) : ${validatedURL}`);
    mainWindow?.show();
  });

  void mainWindow.loadURL(startUrl).catch((error) => {
    console.error(`Échec du chargement de ${startUrl}:`, error);
    mainWindow?.show();
  });
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.setAppUserModelId(APP_ID);

  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.on('before-quit', () => {
    isQuitting = true;
    if (updateCheckTimer) clearInterval(updateCheckTimer);
    if (updateInstallTimer) clearTimeout(updateInstallTimer);
  });

  app.whenReady().then(() => {
    configureSessionPermissions();
    createMainWindow();
    configureAutoUpdater();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
