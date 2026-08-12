const { app, BrowserWindow, dialog, Menu, session, shell } = require('electron');
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

const TASK_ROUTES = Object.freeze({
  'send-message': '/accueil',
  'create-status': '/statuts/creer/texte',
  'create-group': '/accueil?desktopAction=create-group',
  'manage-account': '/profil/infos',
  'view-statuses': '/statuts',
  'open-calls': '/appels',
});

function getTaskAction(argv) {
  const taskArgument = argv.find((argument) => argument.startsWith('--task='));
  const action = taskArgument?.slice('--task='.length);
  return action && Object.prototype.hasOwnProperty.call(TASK_ROUTES, action) ? action : null;
}

function getTaskUrl(action) {
  if (!action) return startUrl;
  return new URL(TASK_ROUTES[action], startUrl).toString();
}

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

function showAboutDialog() {
  const parentWindow = mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined;
  const appName = app.getName() || 'Mookup';
  const version = app.getVersion();

  void dialog.showMessageBox(parentWindow, {
    type: 'info',
    title: `À propos de ${appName}`,
    message: appName,
    detail: [
      `Version : ${version}`,
      'Développé par : Team Mookup',
      'Application Electron de messagerie',
      `Electron : ${process.versions.electron}`,
      `Plateforme : ${process.platform} ${process.arch}`,
    ].join('\\n'),
    buttons: ['OK'],
  });
}

function configureWindowsJumpList() {
  if (process.platform !== 'win32' || !app.isPackaged) return;

  const createTask = (title, description, action) => ({
    program: process.execPath,
    arguments: `--task=${action}`,
    iconPath: process.execPath,
    iconIndex: 0,
    title,
    description,
  });

  try {
    app.setUserTasks([
      createTask('Envoyer un message', 'Ouvrir directement la messagerie', 'send-message'),
      createTask('Créer un statut', 'Publier une nouvelle mise à jour', 'create-status'),
      createTask('Créer un groupe', 'Créer un nouveau groupe de discussion', 'create-group'),
      createTask('Gérer mon compte', 'Ouvrir les paramètres du profil', 'manage-account'),
      createTask('Voir les statuts', 'Consulter les statuts récents', 'view-statuses'),
      createTask('Ouvrir les appels', 'Accéder à la section des appels', 'open-calls'),
    ]);
  } catch (error) {
    console.error('[Jump List] Configuration impossible:', error);
  }
}

function configureApplicationMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { role: 'quit', label: 'Quitter' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo', label: 'Annuler' },
        { role: 'redo', label: 'Rétablir' },
        { type: 'separator' },
        { role: 'cut', label: 'Couper' },
        { role: 'copy', label: 'Copier' },
        { role: 'paste', label: 'Coller' },
        { role: 'selectAll', label: 'Tout sélectionner' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload', label: 'Recharger' },
        { role: 'forceReload', label: 'Forcer le rechargement' },
        { type: 'separator' },
        { role: 'toggleDevTools', label: 'Outils de développement' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Zoom par défaut' },
        { role: 'zoomIn', label: 'Zoom avant' },
        { role: 'zoomOut', label: 'Zoom arrière' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Plein écran' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize', label: 'Réduire' },
        { role: 'close', label: 'Fermer' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'À propos de Mookup',
          click: () => showAboutDialog(),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
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
    // Afficher la vraie barre de menus native Windows, horizontale.
    autoHideMenuBar: false,
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

  const initialTaskAction = getTaskAction(process.argv);
  const initialUrl = getTaskUrl(initialTaskAction);
  void mainWindow.loadURL(initialUrl).catch((error) => {
    console.error(`Échec du chargement de ${initialUrl}:`, error);
    mainWindow?.show();
  });
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.setAppUserModelId(APP_ID);

  app.on('second-instance', (_event, commandLine) => {
    if (!mainWindow) return;

    const taskAction = getTaskAction(commandLine);
    if (taskAction) {
      void mainWindow.loadURL(getTaskUrl(taskAction)).catch((error) => {
        console.error(`[Jump List] Échec de l’action ${taskAction}:`, error);
      });
    }

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
    configureWindowsJumpList();
    configureApplicationMenu();
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
