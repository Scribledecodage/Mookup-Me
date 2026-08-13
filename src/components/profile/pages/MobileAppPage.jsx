'use client';

import {
  AndroidLogo,
  Bell,
  Camera,
  ChatCircle,
  CheckCircle,
  DeviceMobile,
  Info,
} from '@phosphor-icons/react';

const ANDROID_DOWNLOAD_URL = '/api/download/android';

const FEATURES = [
  { icon: Bell, label: 'Recevez vos notifications où que vous soyez.' },
  { icon: ChatCircle, label: 'Retrouvez vos conversations sur votre téléphone.' },
  { icon: Camera, label: 'Partagez rapidement vos photos et vos messages vocaux.' },
];

export default function MobileAppPage() {
  return (
    <div className="w-full max-w-3xl p-6 pb-12">
      <div className="mb-7">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-md bg-green-100 text-green-600">
          <AndroidLogo size={36} weight="fill" />
        </div>
        <h2 className="mb-2 text-2xl font-semibold text-gray-900">Installer Mookup sur téléphone</h2>
        <p className="max-w-2xl text-[15px] leading-6 text-gray-500">
          L’application Android Mookup Messagerie est disponible. La version iPhone sera proposée prochainement.
        </p>
      </div>

      <section className="overflow-hidden rounded-lg border border-green-300/20 p-6 text-white shadow-sm sm:p-7" style={{ background: 'radial-gradient(ellipse at 20% 22%, #286749 0%, transparent 55%), radial-gradient(ellipse at 80% 76%, #1d4935 0%, transparent 60%), radial-gradient(ellipse at 55% 45%, #0d3021 0%, transparent 58%), linear-gradient(145deg, #123d29, #071c13)' }}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-green-100">
              <AndroidLogo size={21} weight="fill" />
              <span className="text-[12px] font-semibold uppercase tracking-[0.16em]">Mookup pour Android</span>
            </div>
            <h3 className="text-xl font-semibold">L’application mobile est prête</h3>
            <p className="mt-2 max-w-xl text-[14px] leading-6 text-green-100">
              Téléchargez l’APK Android v0.0.1 pour recevoir vos messages et utiliser Mookup depuis votre téléphone.
            </p>
          </div>
          <a
            href={ANDROID_DOWNLOAD_URL}
            download
            className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/15 px-5 py-3 text-[14px] font-semibold text-green-50 shadow-sm backdrop-blur-sm transition-colors hover:bg-white/25"
          >
            <DeviceMobile size={19} />
            Télécharger l’APK
          </a>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/20 pt-4 text-[12px] text-green-100">
          <span className="inline-flex items-center gap-1.5"><CheckCircle size={15} /> Android v0.0.1</span>
          <span>Android 8.0 et supérieur</span>
          <span>Mookup-Messagerie.apk</span>
        </div>
      </section>

      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <AndroidLogo size={21} weight="fill" className="text-green-600" />
            <h3 className="text-[17px] font-semibold text-gray-900">Installation Android</h3>
          </div>
          <ol className="space-y-3 text-[13px] leading-5 text-gray-600">
            <li className="flex gap-3"><span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-[11px] font-bold text-green-700">1</span><span>Téléchargez le fichier APK.</span></li>
            <li className="flex gap-3"><span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-[11px] font-bold text-green-700">2</span><span>Ouvrez-le puis autorisez l’installation si Android le demande.</span></li>
            <li className="flex gap-3"><span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-[11px] font-bold text-green-700">3</span><span>Lancez Mookup et connectez-vous à votre compte.</span></li>
          </ol>
        </section>

        <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
          <div className="mb-4 flex items-center gap-2">
            <DeviceMobile size={21} className="text-blue-500" />
            <h3 className="text-[17px] font-semibold text-gray-900">Fonctionnalités mobiles</h3>
          </div>
          <ul className="space-y-3 text-[13px] leading-5 text-gray-600">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex gap-2"><Icon size={17} className="mt-0.5 flex-shrink-0 text-blue-500" /><span>{label}</span></li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 text-[13px] leading-5 text-gray-500">
        <Info size={19} className="mt-0.5 flex-shrink-0 text-gray-400" />
        <p>La version iPhone est encore en préparation. Pour Android, utilisez uniquement l’APK officiel publié sur le dépôt GitHub Mookup.</p>
      </div>
    </div>
  );
}
