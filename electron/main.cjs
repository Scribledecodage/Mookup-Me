const { app, BrowserWindow, Menu, session, shell, ipcMain, nativeImage, screen, desktopCapturer } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('node:fs');
const path = require('node:path');

const APP_ID = 'com.mookup.app';
const DEFAULT_PRODUCTION_URL = 'https://mookup-me.vercel.app';
const isDevelopment = process.argv.includes('--dev') || !app.isPackaged;
const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;
const UPDATE_INSTALL_DELAY_MS = 5000;
const SYSTEM_ACTIVITY_POLL_INTERVAL_MS = 3000;

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
  'open-recent-contact': '/discussions/privee',
});

function getTaskArgument(argv, name) {
  const argument = argv.find(value => value.startsWith(`${name}=`));
  return argument?.slice(name.length + 1) || null;
}

function getTaskAction(argv) {
  const action = getTaskArgument(argv, '--task');
  return action && Object.prototype.hasOwnProperty.call(TASK_ROUTES, action) ? action : null;
}

function getTaskUrl(action, argv = []) {
  if (action === 'open-recent-contact') {
    const encodedChatId = getTaskArgument(argv, '--chat');
    if (encodedChatId) {
      let chatId = encodedChatId;
      try {
        chatId = decodeURIComponent(encodedChatId);
      } catch {
        // Garder l’identifiant brut si l’argument n’est pas encodé.
      }
      return new URL(`/discussions/privee/${encodeURIComponent(chatId)}`, startUrl).toString();
    }
  }
  if (!action) return startUrl;
  return new URL(TASK_ROUTES[action], startUrl).toString();
}

let mainWindow = null;
let updateCheckTimer = null;
let updateInstallTimer = null;
let systemActivityTimer = null;
let systemActivityPollInFlight = false;
let getWindowsModulePromise = null;
let lastSystemActivityKey = '';
let currentSystemActivity = null;
let systemActivityPromptWindow = null;
let pendingSystemActivity = null;
let lastDetectedSystemActivityId = null;
let approvedSystemActivityId = null;
let systemActivityPromptEnabled = false;
const dismissedSystemActivityIds = new Set();
let isInstallingUpdate = false;
let isQuitting = false;
const UPDATE_STATE_FILE = 'pending-update.json';
const RECENT_CONTACTS_FILE = 'recent-contacts.json';
const updateDebugHistory = [];
let recentContacts = [];
const MAX_UPDATE_DEBUG_HISTORY = 200;

ipcMain.handle('electron-update-debug-history', () => updateDebugHistory);

ipcMain.handle('electron-window-is-maximized', (event) => {
  return BrowserWindow.fromWebContents(event.sender)?.isMaximized() === true;
});

ipcMain.on('electron-window-minimize', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize();
});

ipcMain.on('electron-window-toggle-maximize', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) return;
  if (window.isMaximized()) window.unmaximize();
  else window.maximize();
});

ipcMain.on('electron-window-close', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close();
});

ipcMain.on('electron-about-request', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('electron-about-requested');
  }
});

function getMookupAppVersion() {
  try {
    const packagePath = path.join(app.getAppPath(), 'package.json');
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    if (typeof packageData.version === 'string' && packageData.version.trim()) {
      return packageData.version.trim();
    }
  } catch {
    // Utiliser la version Electron uniquement comme solution de secours technique.
  }
  return app.getVersion();
}

ipcMain.handle('electron-app-info', () => ({
  version: getMookupAppVersion(),
  electronVersion: process.versions.electron,
  platform: process.platform,
  arch: process.arch,
}));

ipcMain.handle('electron-system-activity-current', () => currentSystemActivity);

ipcMain.on('electron-system-activity-approve', (_event, appId) => {
  approveSystemActivity(String(appId || ''));
});

ipcMain.on('electron-system-activity-dismiss', (_event, appId) => {
  dismissSystemActivity(String(appId || ''));
});

ipcMain.on('electron-system-activity-prompt-preference', (_event, enabled) => {
  systemActivityPromptEnabled = enabled === true;
  writeSystemActivityLog('prompt-preference-received', { enabled: systemActivityPromptEnabled });
  if (!systemActivityPromptEnabled) {
    pendingSystemActivity = null;
    approvedSystemActivityId = null;
    hideSystemActivityPrompt();
    return;
  }
  updateSystemActivityPrompt(currentSystemActivity);
});

function getUpdateLogPath() {
  const logDirectory = app.getPath('logs');
  fs.mkdirSync(logDirectory, { recursive: true });
  return path.join(logDirectory, 'updater.log');
}

function writeSystemActivityLog(event, details = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    event,
    details,
  };

  console.info(`[System activity] ${event}`, details);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('electron-system-activity-debug', entry);
  }
  return entry;
}

function writeUpdateLog(event, details = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    event,
    details,
  };

  updateDebugHistory.push(entry);
  if (updateDebugHistory.length > MAX_UPDATE_DEBUG_HISTORY) updateDebugHistory.shift();

  try {
    fs.appendFileSync(getUpdateLogPath(), `${JSON.stringify(entry)}\n`, 'utf8');
  } catch (error) {
    console.error('[Auto-update] Impossible d’écrire le journal:', error);
  }

  console.info(`[Auto-update] ${event}`, details);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('electron-update-debug', entry);
  }
  return entry;
}

function getUpdateStatePath() {
  return path.join(app.getPath('userData'), UPDATE_STATE_FILE);
}

function getRecentContactsPath() {
  return path.join(app.getPath('userData'), RECENT_CONTACTS_FILE);
}

function loadRecentContacts() {
  try {
    const parsed = JSON.parse(fs.readFileSync(getRecentContactsPath(), 'utf8'));
    return Array.isArray(parsed) ? parsed.slice(0, 2) : [];
  } catch {
    return [];
  }
}

function saveRecentContacts(contacts) {
  try {
    fs.mkdirSync(app.getPath('userData'), { recursive: true });
    fs.writeFileSync(getRecentContactsPath(), JSON.stringify(contacts, null, 2), 'utf8');
  } catch (error) {
    console.warn('[Jump List] Impossible de mémoriser les conversations récentes:', error.message);
  }
}

function savePendingUpdate(info) {
  try {
    fs.writeFileSync(getUpdateStatePath(), JSON.stringify({
      version: info.version,
      downloadedAt: new Date().toISOString(),
    }, null, 2));
  } catch (error) {
    writeUpdateLog('pending-state-write-failed', { message: error.message });
  }
}

function recordSuccessfulStart() {
  try {
    if (!fs.existsSync(getUpdateStatePath())) return;
    const pending = JSON.parse(fs.readFileSync(getUpdateStatePath(), 'utf8'));
    writeUpdateLog('application-restarted-after-update', {
      version: app.getVersion(),
      expectedVersion: pending.version,
      downloadedAt: pending.downloadedAt,
    });
    fs.rmSync(getUpdateStatePath(), { force: true });
  } catch (error) {
    writeUpdateLog('startup-state-read-failed', { message: error.message });
  }
}

function openUpdateLog() {
  void shell.openPath(getUpdateLogPath());
}

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

function getExecutableIconDataUrl(executablePath) {
  if (!executablePath || !fs.existsSync(executablePath)) return null;
  try {
    const icon = nativeImage.createFromPath(executablePath);
    if (icon.isEmpty()) return null;
    return icon.resize({ width: 64, height: 64 }).toDataURL();
  } catch {
    return null;
  }
}

function formatDesktopAppName(ownerName) {
  const labels = {
    chrome: 'Google Chrome',
    msedge: 'Microsoft Edge',
    firefox: 'Mozilla Firefox',
    code: 'Visual Studio Code',
    discord: 'Discord',
    spotify: 'Spotify',
    steam: 'Steam',
    explorer: 'Explorateur de fichiers',
    notepad: 'Bloc-notes',
  };
  const normalized = ownerName.toLowerCase().replace(/\\.exe$/i, '');
  return labels[normalized] || ownerName || 'Application';
}

function isMookupWindow(windowInfo) {
  const ownerName = String(windowInfo?.owner?.name || '').toLowerCase();
  const ownerPath = String(windowInfo?.owner?.path || '').toLowerCase();
  const title = String(windowInfo?.title || '').toLowerCase();
  return ownerName.includes('mookup')
    || ownerPath.includes('mookup')
    || (ownerName === 'electron' && title.includes('mookup'));
}

function getMookupSystemActivity() {
  return {
    appId: 'mookup',
    appName: 'Mookup',
    details: 'Utilise Mookup',
    logoUrl: null,
  };
}

function getSystemActivityPromptHtml(activity) {
  return `<!doctype html>
<html lang=\"fr\">
<head>
  <meta charset=\"UTF-8\" />
  <meta name=\"color-scheme\" content=\"dark\" />
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: transparent !important; font-family: Segoe UI, Arial, sans-serif; }
    body { padding: 6px; }
    .prompt {
      width: 100%; height: 62px; display: flex; align-items: center; gap: 8px;
      padding: 7px 9px; color: #fff; background: rgba(52,54,60,.76); border: 1px solid rgba(255,255,255,.16);
      border-radius: 13px; box-shadow: 0 8px 22px rgba(0,0,0,.2); backdrop-filter: blur(18px);
      animation: drop 300ms cubic-bezier(.22,1,.36,1) both;
    }
    .icon { width: 30px; height: 30px; flex: 0 0 30px; display: grid; place-items: center; overflow: hidden; border-radius: 7px; background: transparent; }
    .icon img { width: 100%; height: 100%; object-fit: contain; }
    .fallback-icon { color: rgba(255,255,255,.85); font-size: 19px; line-height: 1; }
    .copy { min-width: 0; flex: 1; }
    .question { margin: 0; font-size: 11px; line-height: 15px; font-weight: 500; white-space: nowrap; }
    .app-name { margin: 1px 0 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: rgba(255,255,255,.7); font-size: 10px; font-weight: 600; }
    button { width: 27px; height: 27px; flex: 0 0 27px; border: 0; border-radius: 50%; color: #fff; cursor: pointer; font-size: 16px; line-height: 27px; text-align: center; }
    button:hover { background: rgba(255,255,255,.16); }
    .approve { background: rgba(255,255,255,.15); }
    .approve:hover { background: rgba(16,185,129,.8); }
    .dismiss { color: rgba(255,255,255,.76); background: transparent; }
    @keyframes drop { from { opacity: 0; transform: translateY(-20px) scale(.97); } 65% { opacity: 1; transform: translateY(3px) scale(1.005); } to { opacity: 1; transform: translateY(0) scale(1); } }
  </style>
</head>
<body>
  <div class=\"prompt\">
    <div class=\"icon\"></div>
    <div class=\"copy\">
      <p class=\"question\">Voulez-vous mettre cette application en activité ?</p>
      <p class=\"app-name\"></p>
    </div>
    <button class=\"approve\" type=\"button\" aria-label=\"Mettre cette application en activité\">✓</button>
    <button class=\"dismiss\" type=\"button\" aria-label=\"Fermer\">×</button>
  </div>
  <script>
    const icon = document.querySelector('.icon');
    const appName = document.querySelector('.app-name');
    const approve = document.querySelector('.approve');
    const dismiss = document.querySelector('.dismiss');
    let currentAppId = '';
    function updateActivityPrompt(activity) {
      currentAppId = activity?.appId || '';
      appName.textContent = activity?.appName || 'Application';
      icon.replaceChildren();
      if (activity?.logoUrl) {
        const image = document.createElement('img');
        image.src = activity.logoUrl;
        image.alt = '';
        icon.appendChild(image);
      } else {
        icon.textContent = '▣';
      }
    }
    approve.addEventListener('click', () => window.electronAPI?.approveSystemActivity(currentAppId));
    dismiss.addEventListener('click', () => window.electronAPI?.dismissSystemActivity(currentAppId));
    window.updateActivityPrompt = updateActivityPrompt;
    updateActivityPrompt(${JSON.stringify(activity)});
  </script>
</body>
</html>`;
}

function positionSystemActivityPrompt() {
  if (!systemActivityPromptWindow || systemActivityPromptWindow.isDestroyed()) return;
  const display = screen.getPrimaryDisplay();
  const { x, y, width } = display.workArea;
  const promptWidth = 390;
  systemActivityPromptWindow.setPosition(Math.round(x + (width - promptWidth) / 2), y + 8);
}

function hideSystemActivityPrompt() {
  if (systemActivityPromptWindow && !systemActivityPromptWindow.isDestroyed() && systemActivityPromptWindow.isVisible()) {
    systemActivityPromptWindow.hide();
    writeSystemActivityLog('prompt-hidden');
  }
}

function showSystemActivityPrompt(activity) {
  const wasVisible = systemActivityPromptWindow
    && !systemActivityPromptWindow.isDestroyed()
    && systemActivityPromptWindow.isVisible();
  const activityChanged = pendingSystemActivity?.appId !== activity?.appId;
  pendingSystemActivity = activity;
  if (activityChanged) writeSystemActivityLog('prompt-requested', { activity });
  if (wasVisible) {
    const payload = JSON.stringify(activity);
    void systemActivityPromptWindow.webContents.executeJavaScript(`window.updateActivityPrompt(${payload})`).catch(() => {});
    writeSystemActivityLog('prompt-updated', { activity });
    return;
  }

  if (!systemActivityPromptWindow || systemActivityPromptWindow.isDestroyed()) {
    systemActivityPromptWindow = new BrowserWindow({
      width: 390,
      height: 76,
      frame: false,
      transparent: true,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      closable: false,
      skipTaskbar: true,
      show: false,
      backgroundColor: '#00000000',
      hasShadow: false,
      alwaysOnTop: true,
      focusable: true,
      acceptFirstMouse: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    systemActivityPromptWindow.setAlwaysOnTop(true, 'floating');
    systemActivityPromptWindow.setIgnoreMouseEvents(false);
    systemActivityPromptWindow.on('closed', () => {
      systemActivityPromptWindow = null;
    });
  }

  positionSystemActivityPrompt();
  void systemActivityPromptWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getSystemActivityPromptHtml(activity))}`)
    .then(() => {
      if (pendingSystemActivity?.appId !== activity.appId) return;
      positionSystemActivityPrompt();
      systemActivityPromptWindow?.show();
      writeSystemActivityLog('prompt-visible', { activity });
    })
    .catch(error => {
      console.warn('[System activity] Fenêtre de confirmation indisponible:', error.message);
      writeSystemActivityLog('prompt-error', { message: error.message });
    });
}

function updateSystemActivityPrompt(activity) {
  if (!systemActivityPromptEnabled) {
    pendingSystemActivity = null;
    hideSystemActivityPrompt();
    return;
  }

  const appId = activity?.appId || null;
  if (appId !== lastDetectedSystemActivityId) {
    if (lastDetectedSystemActivityId) dismissedSystemActivityIds.delete(lastDetectedSystemActivityId);
    lastDetectedSystemActivityId = appId;
    if (!appId || appId === 'mookup') dismissedSystemActivityIds.clear();
  }

  if (!activity || appId === 'mookup') {
    approvedSystemActivityId = null;
    pendingSystemActivity = null;
    hideSystemActivityPrompt();
    return;
  }

  if (appId === approvedSystemActivityId || dismissedSystemActivityIds.has(appId)) {
    pendingSystemActivity = null;
    hideSystemActivityPrompt();
    return;
  }

  showSystemActivityPrompt(activity);
}

function approveSystemActivity(appId) {
  if (!pendingSystemActivity || pendingSystemActivity.appId !== appId) return;
  const activity = pendingSystemActivity;
  approvedSystemActivityId = appId;
  pendingSystemActivity = null;
  dismissedSystemActivityIds.delete(appId);
  hideSystemActivityPrompt();
  writeSystemActivityLog('prompt-approved', { activity });
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('electron-system-activity-approved', activity);
}

function dismissSystemActivity(appId) {
  if (!pendingSystemActivity || pendingSystemActivity.appId !== appId) return;
  pendingSystemActivity = null;
  approvedSystemActivityId = null;
  dismissedSystemActivityIds.add(appId);
  hideSystemActivityPrompt();
  writeSystemActivityLog('prompt-dismissed', { appId });
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('electron-system-activity-dismissed', { appId });
}

async function getSystemActivity() {
  try {
    getWindowsModulePromise ||= import('get-windows');
    const { activeWindow } = await getWindowsModulePromise;
    const windowInfo = await activeWindow();
    if (!windowInfo) return null;
    if (isMookupWindow(windowInfo)) return getMookupSystemActivity();

    const ownerName = String(windowInfo.owner?.name || 'Application').replace(/\\.exe$/i, '').trim();
    const title = String(windowInfo.title || '').trim();
    const appName = formatDesktopAppName(ownerName);
    return {
      appId: `desktop:${appName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      appName,
      details: title || `Utilise ${appName}`,
      logoUrl: getExecutableIconDataUrl(windowInfo.owner?.path),
    };
  } catch (error) {
    // Certaines plateformes demandent une permission d’accessibilité : ne pas
    // publier une fausse activité Mookup si la fenêtre active est inaccessible.
    if (!getSystemActivity.permissionWarningShown) {
      getSystemActivity.permissionWarningShown = true;
      console.warn('[System activity] Fenêtre active indisponible:', error.message);
      writeSystemActivityLog('detection-error', { message: error.message });
    }
    return null;
  }
}

async function pollSystemActivity() {
  if (systemActivityPollInFlight || !mainWindow || mainWindow.isDestroyed()) return;
  if (systemActivityPromptWindow && !systemActivityPromptWindow.isDestroyed() && systemActivityPromptWindow.isFocused()) return;
  systemActivityPollInFlight = true;
  try {
    const activity = await getSystemActivity();
    updateSystemActivityPrompt(activity);
    const key = activity ? JSON.stringify(activity) : 'mookup';
    if (key === lastSystemActivityKey) return;
    lastSystemActivityKey = key;
    currentSystemActivity = activity;
    writeSystemActivityLog('activity-detected', { activity });
    mainWindow.webContents.send('electron-system-activity', activity);
  } finally {
    systemActivityPollInFlight = false;
  }
}

function startSystemActivityTracking() {
  if (systemActivityTimer) return;
  void pollSystemActivity();
  systemActivityTimer = setInterval(() => void pollSystemActivity(), SYSTEM_ACTIVITY_POLL_INTERVAL_MS);
}

function stopSystemActivityTracking() {
  if (!systemActivityTimer) return;
  clearInterval(systemActivityTimer);
  systemActivityTimer = null;
}

function requestUpdateInstall(info) {
  if (isInstallingUpdate || isQuitting) return;

  isInstallingUpdate = true;
  writeUpdateLog('installer-launch-requested', {
    version: info.version,
    silent: false,
    forceRunAfter: true,
  });

  try {
    // Laisser l’installeur Windows afficher ses éventuelles confirmations rend
    // l’échec visible et garantit que le raccourci est recréé avec la nouvelle icône.
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.quitAndInstall(false, true);
  } catch (error) {
    writeUpdateLog('installer-launch-failed', { message: error.message, stack: error.stack });
    isInstallingUpdate = false;
    sendUpdateStatus('error', { message: error.message });
    return;
  }

  // Si Electron n’a pas reçu l’évènement de fermeture après quelques secondes,
  // demander une seconde fois sa fermeture afin de laisser electron-updater
  // terminer l’installation qu’il vient de lancer.
  setTimeout(() => {
    if (isQuitting) return;
    writeUpdateLog('installer-quit-fallback', { version: info.version });
    app.quit();
  }, 5000);
}

function configureAutoUpdater() {
  // electron-updater ne fonctionne qu'avec une application empaquetée.
  // Le flag permet de tester le reste de l'application sans contacter GitHub.
  if (isDevelopment || process.env.MOOKUP_DISABLE_AUTO_UPDATE === '1') return;

  autoUpdater.autoDownload = true;
  // Nous distribuons uniquement l’installeur NSIS complet, pas le web installer.
  autoUpdater.disableWebInstaller = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.autoRunAppAfterInstall = true;
  autoUpdater.allowPrerelease = process.env.MOOKUP_ALLOW_PRERELEASE === '1';
  autoUpdater.fullChangelog = true;
  autoUpdater.logger = {
    info: (message) => writeUpdateLog('electron-updater.info', { message: String(message) }),
    warn: (message) => writeUpdateLog('electron-updater.warn', { message: String(message) }),
    error: (message) => writeUpdateLog('electron-updater.error', { message: String(message) }),
    debug: (message) => writeUpdateLog('electron-updater.debug', { message: String(message) }),
  };

  autoUpdater.on('checking-for-update', () => {
    writeUpdateLog('checking-for-update');
    sendUpdateStatus('checking');
  });

  autoUpdater.on('update-available', (info) => {
    writeUpdateLog('update-available', { version: info.version });
    setUpdateTitle(`Mookup — téléchargement de la mise à jour ${info.version}`);
    sendUpdateStatus('available', { version: info.version });
  });

  autoUpdater.on('update-not-available', (info) => {
    setUpdateTitle('Mookup');
    sendUpdateStatus('up-to-date', { version: info.version });
  });

  autoUpdater.on('download-progress', (progress) => {
    const percent = Math.round(progress.percent * 10) / 10;
    if (percent === 100 || percent === 0) {
      writeUpdateLog('download-progress', { percent, transferred: progress.transferred, total: progress.total });
    }
    setUpdateTitle(`Mookup — mise à jour ${percent}%`);
    sendUpdateStatus('downloading', {
      percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    writeUpdateLog('update-downloaded', { version: info.version });
    savePendingUpdate(info);
    setUpdateTitle(`Mookup — redémarrage pour la version ${info.version}`);
    sendUpdateStatus('downloaded', { version: info.version });

    // Laisser la notification et les logs atteindre le renderer avant de lancer
    // l’installeur Windows, puis redémarrer automatiquement l’application.
    if (updateInstallTimer) clearTimeout(updateInstallTimer);
    updateInstallTimer = setTimeout(() => requestUpdateInstall(info), UPDATE_INSTALL_DELAY_MS);
  });

  autoUpdater.on('before-quit-for-update', () => {
    writeUpdateLog('before-quit-for-update');
    isQuitting = true;
  });

  app.on('will-quit', () => {
    writeUpdateLog('will-quit', { installingUpdate: isInstallingUpdate });
  });

  autoUpdater.on('error', (error) => {
    writeUpdateLog('update-error', { message: error.message, stack: error.stack });
    setUpdateTitle('Mookup');
    sendUpdateStatus('error', { message: error.message });
  });

  const checkForUpdates = async () => {
    if (isInstallingUpdate || !app.isPackaged) return;
    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      writeUpdateLog('update-check-failed', { message: error.message });
    }
  };

  writeUpdateLog('auto-updater-configured', {
    packaged: app.isPackaged,
    platform: process.platform,
    updateCheckIntervalMs: UPDATE_CHECK_INTERVAL_MS,
  });

  // Laisser la fenêtre démarrer avant le premier accès réseau.
  setTimeout(() => void checkForUpdates(), 8000);
  updateCheckTimer = setInterval(() => void checkForUpdates(), UPDATE_CHECK_INTERVAL_MS);
}

async function cacheContactIcon(contact, index) {
  if (!contact?.photoURL || typeof contact.photoURL !== 'string') return null;

  try {
    const response = await fetch(contact.photoURL, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const image = nativeImage.createFromBuffer(Buffer.from(await response.arrayBuffer()));
    if (image.isEmpty()) return null;

    const png = image.toPNG();
    const ico = Buffer.alloc(22 + png.length);
    ico.writeUInt16LE(0, 0);
    ico.writeUInt16LE(1, 2);
    ico.writeUInt16LE(1, 4);
    ico.writeUInt8(0, 6);
    ico.writeUInt8(0, 7);
    ico.writeUInt8(0, 8);
    ico.writeUInt8(0, 9);
    ico.writeUInt16LE(1, 10);
    ico.writeUInt16LE(32, 12);
    ico.writeUInt32LE(png.length, 14);
    ico.writeUInt32LE(22, 18);
    png.copy(ico, 22);

    const iconDirectory = path.join(app.getPath('userData'), 'recent-contact-icons');
    fs.mkdirSync(iconDirectory, { recursive: true });
    const iconPath = path.join(iconDirectory, `contact-${index}.ico`);
    fs.writeFileSync(iconPath, ico);
    return iconPath;
  } catch (error) {
    console.warn('[Jump List] Avatar récent indisponible:', error.message);
    return null;
  }
}

async function configureWindowsJumpList(recentContacts = []) {
  if (process.platform !== 'win32' || !app.isPackaged) return;

  const createTask = (title, description, action, extraArgument = '', iconPath = process.execPath) => ({
    program: process.execPath,
    arguments: [`--task=${action}`, extraArgument].filter(Boolean).join(' '),
    iconPath,
    iconIndex: iconPath === process.execPath ? 0 : 0,
    title,
    description,
  });

  const recentTasks = Array.isArray(recentContacts)
    ? await Promise.all(recentContacts.slice(0, 2).map(async (contact, index) => createTask(
      `Message à ${String(contact?.displayName || (contact?.isBot ? 'Bot' : 'ce contact')).slice(0, 45)}`,
      contact?.isBot ? 'Dernier bot utilisé' : 'Dernière personne contactée',
      'open-recent-contact',
      `--chat=${encodeURIComponent(String(contact?.chatId || ''))}`,
      await cacheContactIcon(contact, index) || process.execPath,
    )))
    : [];

  try {
    app.setUserTasks([
      ...recentTasks,
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

ipcMain.on('electron-recent-contacts', (_event, contacts) => {
  if (!Array.isArray(contacts)) return;

  recentContacts = contacts
    .filter(contact => contact && typeof contact.chatId === 'string' && contact.chatId.trim())
    .map(contact => ({
      chatId: contact.chatId,
      uid: typeof contact.uid === 'string' ? contact.uid : '',
      displayName: typeof contact.displayName === 'string' && contact.displayName.trim()
        ? contact.displayName.trim()
        : contact.isBot ? 'Bot' : 'ce contact',
      photoURL: typeof contact.photoURL === 'string' ? contact.photoURL : null,
      isBot: Boolean(contact.isBot),
    }))
    .slice(0, 2);

  saveRecentContacts(recentContacts);
  void configureWindowsJumpList(recentContacts);
});

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
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('electron-about-requested');
            }
          },
        },
        {
          label: 'Ouvrir le journal des mises à jour',
          click: () => openUpdateLog(),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

const MEDIA_PERMISSION_ORIGINS = new Set([
  'https://sfu.mirotalk.com',
  'https://mirotalk.com',
]);

function isTrustedMediaOrigin(targetUrl) {
  if (isAllowedUrl(targetUrl)) return true;

  try {
    return MEDIA_PERMISSION_ORIGINS.has(new URL(targetUrl).origin);
  } catch {
    return false;
  }
}

function configureSessionPermissions() {
  const allowedPermissions = new Set([
    'media',
    'speaker-selection',
    'display-capture',
    'notifications',
    'clipboard-read',
    'clipboard-sanitized-write',
  ]);

  const canGrantPermission = (requestingUrl, permission) => {
    if (!allowedPermissions.has(permission)) return false;

    // Les appels sont rendus dans un iframe MiroTalk. Chromium demande donc
    // l’autorisation au domaine MiroTalk, pas au domaine de Mookup.
    // Le filtrage par origine évite d’accorder le micro/la caméra à un iframe
    // arbitraire tout en laissant fonctionner les appels dans Electron.
    if (permission === 'media' || permission === 'speaker-selection' || permission === 'display-capture') {
      return isTrustedMediaOrigin(requestingUrl);
    }

    return isAllowedUrl(requestingUrl);
  };

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details = {}) => {
    const requestingUrl = details.requestingUrl || webContents.getURL();
    callback(canGrantPermission(requestingUrl, permission));
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    const origin = requestingOrigin || webContents?.getURL() || '';
    return canGrantPermission(origin, permission);
  });

  // Electron ne fournit pas automatiquement une source à getDisplayMedia().
  // Sans ce handler, MiroTalk renvoie NotSupportedError pour `screenType`.
  if (typeof session.defaultSession.setDisplayMediaRequestHandler === 'function') {
    session.defaultSession.setDisplayMediaRequestHandler(async (request, callback) => {
      const requestingUrl = request?.securityOrigin || request?.frame?.url || '';
      if (!isTrustedMediaOrigin(requestingUrl)) {
        callback();
        return;
      }

      try {
        const sources = await desktopCapturer.getSources({
          types: ['screen', 'window'],
          thumbnailSize: { width: 1, height: 1 },
        });
        const source = sources.find(item => item.id.startsWith('screen:')) || sources[0];
        if (source) callback({ video: source });
        else callback();
      } catch (error) {
        console.warn('[Media] Partage d’écran indisponible:', error.message);
        callback();
      }
    });
  }
}

function createMainWindow() {
  const iconFile = process.platform === 'win32' ? 'Logo.ico' : 'Logo.png';
  const iconPath = app.isPackaged
    ? path.join(__dirname, 'public', iconFile)
    : path.join(__dirname, '..', 'public', iconFile);

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    show: false,
    // La barre native est remplacée par la barre Mookup rendue dans React.
    frame: false,
    resizable: true,
    thickFrame: true,
    title: 'Mookup',
    icon: iconPath,
    backgroundColor: '#111318',
    // La barre de menus native ne doit pas réapparaître à côté de notre barre.
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

  const sendWindowState = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send('electron-window-state-changed', mainWindow.isMaximized());
  };

  mainWindow.on('maximize', sendWindowState);
  mainWindow.on('unmaximize', sendWindowState);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`Impossible de charger Mookup (${errorCode}: ${errorDescription}) : ${validatedURL}`);
    mainWindow?.show();
  });

  const initialTaskAction = getTaskAction(process.argv);
  const initialUrl = getTaskUrl(initialTaskAction, process.argv);
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
      void mainWindow.loadURL(getTaskUrl(taskAction, commandLine)).catch((error) => {
        console.error(`[Jump List] Échec de l’action ${taskAction}:`, error);
      });
    }

    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.on('before-quit', () => {
    writeUpdateLog('before-quit', { installingUpdate: isInstallingUpdate });
    isQuitting = true;
    if (updateCheckTimer) clearInterval(updateCheckTimer);
    if (updateInstallTimer) clearTimeout(updateInstallTimer);
    stopSystemActivityTracking();
  });

  app.whenReady().then(() => {
    recordSuccessfulStart();
    writeUpdateLog('application-started', {
      version: app.getVersion(),
      packaged: app.isPackaged,
      platform: process.platform,
    });
    recentContacts = loadRecentContacts();
    void configureWindowsJumpList(recentContacts);
    configureApplicationMenu();
    configureSessionPermissions();
    createMainWindow();
    startSystemActivityTracking();
    configureAutoUpdater();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
