'use client';

import { DeviceMobile, Info, Bell, ChatCircle, Camera } from '@phosphor-icons/react';

const FEATURES = [
  { icon: Bell, label: 'Recevez vos notifications où que vous soyez.' },
  { icon: ChatCircle, label: 'Retrouvez vos conversations sur votre téléphone.' },
  { icon: Camera, label: 'Partagez rapidement vos photos et vos messages vocaux.' },
];

export default function MobileAppPage() {
  return (
    <div className="w-full max-w-3xl p-6 pb-12">
      <div className="mb-7">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-md bg-indigo-100 text-indigo-600">
          <DeviceMobile size={36} weight="fill" />
        </div>
        <h2 className="mb-2 text-2xl font-semibold text-gray-900">Installer Mookup sur téléphone</h2>
        <p className="max-w-2xl text-[15px] leading-6 text-gray-500">
          La version mobile de Mookup arrive bientôt sur Android et iPhone. Cette page sera mise à jour lorsque l’installation sera disponible.
        </p>
      </div>

      <section className="overflow-hidden rounded-lg border border-indigo-300/20 p-6 text-white shadow-sm sm:p-7" style={{ background: 'radial-gradient(ellipse at 20% 22%, #3b4a7a 0%, transparent 55%), radial-gradient(ellipse at 80% 76%, #232c52 0%, transparent 60%), radial-gradient(ellipse at 55% 45%, #101a3a 0%, transparent 58%), linear-gradient(145deg, #1b2350, #0b1030)' }}>
        <div className="flex items-start gap-4">
          <DeviceMobile size={27} className="mt-0.5 flex-shrink-0 text-blue-100" />
          <div>
            <h3 className="text-xl font-semibold">Application mobile en préparation</h3>
            <p className="mt-2 max-w-xl text-[14px] leading-6 text-blue-100">
              Aucun téléchargement n’est proposé pour le moment. Nous préparons une expérience mobile officielle, rapide et adaptée à votre téléphone.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 border-t border-white/20 pt-5 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-start gap-2 text-[13px] leading-5 text-blue-100">
              <Icon size={18} className="mt-0.5 flex-shrink-0" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-5 flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-[13px] leading-5 text-gray-600">
        <Info size={19} className="mt-0.5 flex-shrink-0 text-gray-400" />
        <p>En attendant, vous pouvez utiliser Mookup depuis le navigateur de votre téléphone. Aucun fichier ne sera téléchargé depuis cette page.</p>
      </div>
    </div>
  );
}
