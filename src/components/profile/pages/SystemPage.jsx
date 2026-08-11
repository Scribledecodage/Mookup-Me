'use client';

import { useEffect, useState } from 'react';
import { ArrowClockwise, CheckCircle, CircleNotch, Info, Trash } from '@phosphor-icons/react';

async function readStorageInfo() {
  let cacheCount = 0;
  let usage = 0;
  let quota = 0;
  if ('caches' in window) cacheCount = (await caches.keys()).length;
  if (navigator.storage?.estimate) {
    const estimate = await navigator.storage.estimate();
    usage = estimate.usage || 0;
    quota = estimate.quota || 0;
  }
  return { localKeys: window.localStorage.length, cacheCount, usage, quota };
}

function formatBytes(bytes) {
  if (!bytes) return '0 Ko';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function SystemPage() {
  const [storage, setStorage] = useState({ localKeys: 0, cacheCount: 0, usage: 0, quota: 0 });
  const [isClearing, setIsClearing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    readStorageInfo().then(setStorage).catch((loadError) => {
      console.error('Erreur chargement stockage local:', loadError);
      setError('Impossible de récupérer le stockage local.');
    });
  }, []);

  const refreshStorage = async () => {
    try {
      setStorage(await readStorageInfo());
    } catch {
      setError('Impossible de lire le stockage local.');
    }
  };

  const clearCache = async () => {
    setIsClearing(true);
    setError('');
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
      await refreshStorage();
      setMessage('Le cache a été nettoyé.');
      setTimeout(() => setMessage(''), 2500);
    } catch (clearError) {
      console.error('Erreur nettoyage cache:', clearError);
      setError('Impossible de nettoyer le cache.');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="p-6 pb-12 w-full max-w-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">Système</h2>
        <p className="text-gray-500 text-[15px]">Consultez les informations techniques de Mookup.</p>
      </div>

      <div className="space-y-3">
        <section className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <Info size={24} className="flex-shrink-0 text-blue-500" />
          <div className="min-w-0 flex-1"><h3 className="text-[15px] font-semibold text-gray-900">Version de Mookup</h3><p className="mt-1 text-[13px] text-gray-500">Vous utilisez Mookup sur le web.</p><p className="mt-1 text-[11px] text-gray-400">Les mises à jour sont vérifiées automatiquement.</p></div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3"><Info size={24} className="flex-shrink-0 text-blue-500" /><div className="min-w-0 flex-1"><h3 className="text-[15px] font-semibold text-gray-900">Stockage local</h3><p className="mt-1 text-[13px] text-gray-500">{formatBytes(storage.usage)} utilisés{storage.quota ? ` sur ${formatBytes(storage.quota)}` : ''}.</p><p className="mt-1 text-[11px] text-gray-400">{storage.localKeys} préférence{storage.localKeys > 1 ? 's' : ''} locale{storage.localKeys > 1 ? 's' : ''} et {storage.cacheCount} cache{storage.cacheCount > 1 ? 's' : ''} actif{storage.cacheCount > 1 ? 's' : ''}.</p></div></div>
          <div className="mt-3 flex gap-2"><button type="button" onClick={refreshStorage} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] font-semibold text-gray-700 transition-colors hover:bg-gray-50"><ArrowClockwise size={17} /> Actualiser</button><button type="button" onClick={clearCache} disabled={isClearing} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">{isClearing ? <CircleNotch size={18} className="animate-spin" /> : <Trash size={18} />} Nettoyer le cache</button></div>
        </section>

        <section className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4"><div><h3 className="text-[15px] font-semibold text-gray-800">Actualiser Mookup</h3><p className="mt-1 text-[13px] text-gray-500">Recharge l’application sans supprimer vos préférences.</p></div><button type="button" onClick={() => window.location.reload()} aria-label="Actualiser Mookup" className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm hover:bg-blue-50"><ArrowClockwise size={19} /></button></section>
      </div>

      {message && <p className="mt-4 flex items-center justify-center gap-2 text-center text-[13px] text-green-600"><CheckCircle size={17} />{message}</p>}
      {error && <p className="mt-4 text-center text-[13px] text-red-600">{error}</p>}
    </div>
  );
}
