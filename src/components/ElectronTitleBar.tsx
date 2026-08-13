'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
} from '@phosphor-icons/react';

const noDragStyle = { WebkitAppRegion: 'no-drag' } as CSSProperties;

function WindowButton({
  label,
  onClick,
  children,
  danger = false,
  windowControl = false,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
  windowControl?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`electron-titlebar-button ${windowControl ? 'electron-titlebar-window-control' : ''} ${danger ? 'electron-titlebar-button-danger' : ''}`}
      style={noDragStyle}
    >
      {children}
    </button>
  );
}

function ElectronTitleBar() {
  const [isMac, setIsMac] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.isElectron) return;

    const mac = api.platform === 'darwin';
    setIsMac(mac);
    if (!mac) return;

    const maximizedPromise = api.isWindowMaximized?.();
    if (maximizedPromise) void maximizedPromise.then(setIsMaximized).catch(() => {});
    return api.onWindowStateChanged?.(setIsMaximized);
  }, []);

  const navigate = (direction: 'back' | 'forward') => {
    if (direction === 'back') window.history.back();
    else window.history.forward();
  };

  const openAbout = () => {
    window.electronAPI?.requestAbout?.();
  };

  const openToolbarSection = (tabId: string) => {
    window.dispatchEvent(new CustomEvent('app_navigate', { detail: { tabId } }));
  };

  const toolbarItems = [
    { id: 'discussion', label: 'Accueil' },
    { id: 'commu', label: 'Amis' },
    { id: 'actus', label: 'Statuts' },
    { id: 'appels', label: 'Appels' },
    { id: 'profil', label: 'Profil' },
    { id: 'aide', label: 'Aide' },
  ];

  return (
    <header className="electron-titlebar" aria-label="Barre de titre Mookup">
      <div className="electron-titlebar-leading" style={noDragStyle}>
        <div className="electron-titlebar-side electron-titlebar-left" style={noDragStyle}>
          <WindowButton label="Précédent" onClick={() => navigate('back')}>
            <ArrowLeft size={17} weight="bold" />
          </WindowButton>
          <WindowButton label="Suivant" onClick={() => navigate('forward')}>
            <ArrowRight size={17} weight="bold" />
          </WindowButton>
        </div>

        <div className="electron-titlebar-brand" aria-label="Mookup" style={noDragStyle}>
          <img src="/Logo.png" alt="" width={22} height={22} />
          <span>Mookup</span>
        </div>

        <nav className="electron-titlebar-toolbar" aria-label="Navigation principale" style={noDragStyle}>
          {toolbarItems.map(item => (
            <button
              key={item.id}
              type="button"
              className="electron-titlebar-toolbar-button"
              onClick={() => item.id === 'aide' ? openAbout() : openToolbarSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {isMac && (
        <div className="electron-titlebar-side electron-titlebar-right" style={noDragStyle}>
          <span className="electron-titlebar-separator" aria-hidden="true" />
          <WindowButton
            label="Fermer"
            onClick={() => window.electronAPI?.closeWindow?.()}
            windowControl
            danger
          >
            <span className="mookup-window-shape mookup-window-shape-close" aria-hidden="true" />
          </WindowButton>
          <WindowButton
            label="Réduire"
            onClick={() => window.electronAPI?.minimizeWindow?.()}
            windowControl
          >
            <span className="mookup-window-shape mookup-window-shape-minimize" aria-hidden="true" />
          </WindowButton>
          <WindowButton
            label={isMaximized ? 'Restaurer' : 'Agrandir'}
            onClick={() => window.electronAPI?.toggleMaximizeWindow?.()}
            windowControl
          >
            <span className="mookup-window-shape mookup-window-shape-maximize" aria-hidden="true" />
          </WindowButton>
        </div>
      )}
    </header>
  );
}

export default function ElectronWindowShell({ children }: { children: ReactNode }) {
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    if (window.electronAPI?.isElectron !== true) return;

    document.documentElement.classList.add('electron-app');
    setIsElectron(true);

    return () => document.documentElement.classList.remove('electron-app');
  }, []);

  if (!isElectron) return children;

  return (
    <div className="electron-window-shell">
      <ElectronTitleBar />
      <div className="electron-window-content">{children}</div>
    </div>
  );
}
