// Extension du type Window pour les intégrations natives
interface ElectronUpdateDebugEntry {
  timestamp: string;
  event: string;
  details?: Record<string, unknown>;
}

interface ElectronUpdateStatus {
  status: 'checking' | 'available' | 'up-to-date' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  percent?: number;
  bytesPerSecond?: number;
  transferred?: number;
  total?: number;
  message?: string;
}

interface ElectronSystemActivity {
  appId: string;
  appName: string;
  details?: string;
  state?: string;
  logoUrl?: string | null;
}

interface ElectronSystemActivityDebugEntry {
  timestamp: string;
  event: string;
  details?: Record<string, unknown>;
}

interface ElectronAppInfo {
  version: string;
  electronVersion: string;
  platform: string;
  arch: string;
}

interface Window {
  /** Positionné à true par le bridge Electron quand l'application est empaquetée. */
  electronAPI?: {
    isElectron: boolean;
    platform: string;
    electronVersion: string;
    getAppInfo?: () => Promise<ElectronAppInfo>;
    minimizeWindow?: () => void;
    toggleMaximizeWindow?: () => void;
    closeWindow?: () => void;
    setUnreadCount?: (count: number, imageDataUrl?: string) => void;
    clearUnreadCount?: () => void;
    showNativeMessageNotification?: (notification: {
      messageId: string;
      conversationId: string;
      conversationName?: string;
      senderName: string;
      body: string;
      iconUrl?: string;
    }) => void;
    onNotificationClicked?: (listener: (data: {
      conversationId: string;
      conversationName?: string;
      avatar?: string;
    }) => void) => () => void;
    isWindowMaximized?: () => Promise<boolean>;
    isWindowFocused?: () => Promise<boolean>;
    requestAbout?: () => void;
    onWindowStateChanged?: (listener: (maximized: boolean) => void) => () => void;
    onWindowFocusChanged?: (listener: (focused: boolean) => void) => () => void;
    getUpdateDebugHistory?: () => Promise<ElectronUpdateDebugEntry[]>;
    getSystemActivity?: () => Promise<ElectronSystemActivity | null>;
    approveSystemActivity?: (appId: string) => void;
    dismissSystemActivity?: (appId: string) => void;
    setSystemActivityPromptEnabled?: (enabled: boolean) => void;
    onSystemActivity?: (listener: (activity: ElectronSystemActivity | null) => void) => () => void;
    onSystemActivityDebug?: (listener: (entry: ElectronSystemActivityDebugEntry) => void) => () => void;
    onSystemActivityApproved?: (listener: (activity: ElectronSystemActivity) => void) => () => void;
    onSystemActivityDismissed?: (listener: (activity: { appId: string }) => void) => () => void;
    setRecentContacts?: (contacts: Array<{ chatId: string; uid: string; displayName: string; photoURL?: string | null; isBot: boolean }>) => void;
    onUpdateStatus?: (listener: (status: ElectronUpdateStatus) => void) => () => void;
    onAboutRequested?: (listener: () => void) => () => void;
    onUpdateDebug?: (listener: (entry: ElectronUpdateDebugEntry) => void) => () => void;
  };
  /** Positionné à true par un gestionnaire interne quand il intercepte l'event app_back. */
  _appBackHandled?: boolean;
}
