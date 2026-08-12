'use client';

import { useEffect, useState } from 'react';
import {
  ArrowClockwise,
  CheckCircle,
  CircleNotch,
  DownloadSimple,
  Info,
  Laptop,
  Monitor,
  ShieldCheck,
  WindowsLogo,
} from '@phosphor-icons/react';

const DOWNLOAD_URL = '/api/download/windows';
const RELEASE_INFO_URL = `${DOWNLOAD_URL}?info=1`;

function formatSize(size) {
  if (!Number.isFinite(size) || size <= 0) return null;
  const units = ['o', 'Ko', 'Mo', 'Go'];
  let value = size;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export default function WindowsAppPage() {
  const [release, setRelease] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadRelease = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(RELEASE_INFO_URL, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Version indisponible');
      setRelease(data);
    } catch (loadError) {
      console.error('Impossible de charger la version Windows:', loadError);
      setError('La dernière version n’a pas pu être chargée. Le téléchargement peut tout de même être réessayé.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRelease();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="w-full max-w-3xl p-6 pb-12">
      <div className="mb-7">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-md bg-indigo-100 text-indigo-600">
          <WindowsLogo size={36} weight="fill" />
        </div>
        <h2 className="mb-2 text-2xl font-semibold text-gray-900">Installer l’application Windows</h2>
        <p className="max-w-2xl text-[15px] leading-6 text-gray-500">
          Retrouvez Mookup directement sur votre ordinateur Windows, avec une fenêtre dédiée et les raccourcis vers vos conversations récentes.
        </p>
      </div>

      <section
        className="overflow-hidden rounded-lg border border-indigo-300/20 p-6 text-white shadow-sm sm:p-7"
        style={{ background: 'radial-gradient(ellipse at 20% 22%, #3b4a7a 0%, transparent 55%), radial-gradient(ellipse at 80% 76%, #232c52 0%, transparent 60%), radial-gradient(ellipse at 55% 45%, #101a3a 0%, transparent 58%), linear-gradient(145deg, #1b2350, #0b1030)' }}
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-blue-100">
              <Monitor size={19} />
              <span className="text-[12px] font-semibold uppercase tracking-[0.16em]">Mookup pour Windows</span>
            </div>
            <h3 className="text-xl font-semibold">Une expérience plus confortable sur PC</h3>
            <p className="mt-2 max-w-xl text-[14px] leading-6 text-blue-100">
              Installez l’application officielle pour recevoir vos messages, ouvrir Mookup plus rapidement et profiter de l’intégration Windows.
            </p>
          </div>
          <a
            href={DOWNLOAD_URL}
            download
            className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-sm px-5 py-3 text-[14px] font-semibold text-indigo-50 transition-colors hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #596ca7 0%, #46558f 52%, #303965 100%)' }}
          >
            <Laptop size={19} />
            Télécharger l’application
          </a>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/20 pt-4 text-[12px] text-blue-100">
          {isLoading ? (
            <span className="inline-flex items-center gap-2"><CircleNotch size={15} className="animate-spin" /> Recherche de la dernière version…</span>
          ) : release ? (
            <>
              <span className="inline-flex items-center gap-1.5"><CheckCircle size={15} /> Version {release.version}</span>
              {formatSize(release.size) && <span>{formatSize(release.size)}</span>}
              <span className="truncate">{release.filename}</span>
            </>
          ) : (
            <span className="inline-flex items-center gap-2"><Info size={15} /> Version momentanément indisponible</span>
          )}
        </div>
      </section>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] leading-5 text-amber-800">
          <Info size={18} className="mt-0.5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => void loadRelease()} className="inline-flex flex-shrink-0 items-center gap-1 font-semibold hover:underline">
            <ArrowClockwise size={15} /> Réessayer
          </button>
        </div>
      )}

      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <DownloadSimple size={21} className="text-blue-500" />
            <h3 className="text-[17px] font-semibold text-gray-900">Installation rapide</h3>
          </div>
          <ol className="space-y-3 text-[13px] leading-5 text-gray-600">
            <li className="flex gap-3"><span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">1</span><span>Téléchargez l’installeur Windows.</span></li>
            <li className="flex gap-3"><span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">2</span><span>Ouvrez le fichier <strong className="font-semibold text-gray-800">Mookup-Setup.exe</strong>.</span></li>
            <li className="flex gap-3"><span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">3</span><span>Lancez Mookup depuis le raccourci créé.</span></li>
          </ol>
        </section>

        <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck size={21} className="text-emerald-500" />
            <h3 className="text-[17px] font-semibold text-gray-900">À savoir</h3>
          </div>
          <ul className="space-y-3 text-[13px] leading-5 text-gray-600">
            <li className="flex gap-2"><CheckCircle size={17} className="mt-0.5 flex-shrink-0 text-emerald-500" /><span>Compatible avec Windows 10 et Windows 11 en 64 bits.</span></li>
            <li className="flex gap-2"><CheckCircle size={17} className="mt-0.5 flex-shrink-0 text-emerald-500" /><span>Vos données restent synchronisées avec le site.</span></li>
            <li className="flex gap-2"><CheckCircle size={17} className="mt-0.5 flex-shrink-0 text-emerald-500" /><span>Les mises à jour sont proposées automatiquement.</span></li>
          </ul>
        </section>
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 text-[13px] leading-5 text-gray-500">
        <Info size={19} className="mt-0.5 flex-shrink-0 text-gray-400" />
        <p>Après l’installation, connectez-vous avec le même compte que sur le site pour retrouver vos conversations et vos paramètres.</p>
      </div>
    </div>
  );
}
