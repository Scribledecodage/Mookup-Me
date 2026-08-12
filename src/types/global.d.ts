// Extension du type Window pour les intégrations natives
interface ElectronUpdateStatus {
  status: 'checking' | 'available' | 'up-to-date' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  percent?: number;
  bytesPerSecond?: number;
  transferred?: number;
  total?: number;
  message?: string;
}

interface Window {
  /** Positionné à true par le bridge Electron quand l'application est empaquetée. */
  electronAPI?: {
    isElectron: boolean;
    platform: string;
    electronVersion: string;
    onUpdateStatus?: (listener: (status: ElectronUpdateStatus) => void) => () => void;
  };
  /** Positionné à true par un gestionnaire interne quand il intercepte l'event app_back. */
  _appBackHandled?: boolean;
}
