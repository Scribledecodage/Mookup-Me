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

interface Window {
  /** Positionné à true par le bridge Electron quand l'application est empaquetée. */
  electronAPI?: {
    isElectron: boolean;
    platform: string;
    electronVersion: string;
    getUpdateDebugHistory?: () => Promise<ElectronUpdateDebugEntry[]>;
    getSystemActivity?: () => Promise<ElectronSystemActivity | null>;
    onSystemActivity?: (listener: (activity: ElectronSystemActivity | null) => void) => () => void;
    setRecentContacts?: (contacts: Array<{ chatId: string; uid: string; displayName: string; photoURL?: string | null; isBot: boolean }>) => void;
    onUpdateStatus?: (listener: (status: ElectronUpdateStatus) => void) => () => void;
    onUpdateDebug?: (listener: (entry: ElectronUpdateDebugEntry) => void) => () => void;
  };
  /** Positionné à true par un gestionnaire interne quand il intercepte l'event app_back. */
  _appBackHandled?: boolean;
}
