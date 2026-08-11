'use client';

import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

export default function VersionChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const checkVersion = useCallback(async () => {
    if (isChecking) return;
    setIsChecking(true);
    try {
      if (!Capacitor.isNativePlatform() && window.location.hostname === 'localhost') return;
      const response = await fetch('/version.json', { cache: 'no-cache' });
      if (!response.ok) return;
      const data = await response.json();
      if (!data?.version) return;
      const local = localStorage.getItem('app_version');
      if (!local) {
        localStorage.setItem('app_version', data.version);
      } else if (data.version !== local) {
        setUpdateAvailable(true);
        setTimeout(() => setVisible(true), 60);
      }
    } catch {
      // échec silencieux
    } finally {
      setIsChecking(false);
    }
  }, [isChecking]);

  useEffect(() => {
    const t = setTimeout(checkVersion, 2000);
    const onFocus = () => checkVersion();
    window.addEventListener('focus', onFocus);
    const interval = setInterval(checkVersion, 10 * 60 * 1000);
    return () => {
      clearTimeout(t);
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
  }, [checkVersion]);

  const handleUpdate = async () => {
    setIsUpdating(true);
    // Cacher la popup immédiatement
    setVisible(false);
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          await reg.update();
          if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }
      const res = await fetch('/version.json', { cache: 'no-cache' });
      const data = await res.json();
      localStorage.setItem('app_version', data.version);
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      const url = new URL(window.location.origin);
      url.searchParams.set('upd', data.version);
      window.location.href = url.toString();
    } catch {
      window.location.reload();
    }
  };

  if (!updateAvailable) return null;

  return (
    <div
      aria-live="polite"
      className={`
        fixed z-50
        bottom-5 right-5
        w-[260px]
        transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
        ${visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0 pointer-events-none'}
      `}
    >
      <div className="
        bg-white
        border border-gray-200
        rounded-2xl
        shadow-[0_4px_24px_rgba(0,0,0,0.09)]
        px-4 py-3
      ">
        <p className="text-[13.5px] font-medium text-gray-900 leading-tight">
          Mise à jour disponible
        </p>
        <p className="text-[12px] text-gray-400 mt-0.5 mb-3">
          Une nouvelle version est prête.
        </p>

        <button
          onClick={handleUpdate}
          disabled={isUpdating}
          className="
            w-full text-[12.5px] font-semibold text-white
            bg-[#5046e5] hover:bg-[#4338ca]
            py-2 rounded-xl
            active:scale-95
            disabled:opacity-60 disabled:cursor-not-allowed
            transition-all duration-150
            flex items-center justify-center gap-1.5
          "
        >
          {isUpdating ? (
            <>
              <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Mise à jour…
            </>
          ) : (
            'Mettre à jour'
          )}
        </button>
      </div>
    </div>
  );
}
