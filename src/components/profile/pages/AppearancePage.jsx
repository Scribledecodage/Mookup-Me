'use client';

import { Info, Monitor, Palette, TextAa } from '@phosphor-icons/react';

function ComingSoonCard({ icon: Icon, title, description }) {
  return (
    <section className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 opacity-80">
      <Icon size={24} className="mt-0.5 flex-shrink-0 text-gray-400" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[15px] font-semibold text-gray-800">{title}</h3>
          <span className="whitespace-nowrap text-[11px] text-gray-400">Bientôt disponible</span>
        </div>
        <p className="mt-1 text-[13px] leading-5 text-gray-500">{description}</p>
      </div>
    </section>
  );
}

export default function AppearancePage() {
  return (
    <div className="p-6 pb-12 w-full max-w-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">Apparence</h2>
        <p className="text-gray-500 text-[15px]">Adaptez l’affichage de Mookup à vos préférences.</p>
      </div>

      <div className="space-y-3">
        <ComingSoonCard icon={Palette} title="Thème" description="Choisissez entre un thème clair, sombre ou automatique." />
        <ComingSoonCard icon={TextAa} title="Taille du texte" description="Ajustez la taille des textes pour améliorer votre confort." />
        <ComingSoonCard icon={Monitor} title="Densité d’affichage" description="Choisissez un affichage compact ou plus aéré." />
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <Info size={22} className="mt-0.5 flex-shrink-0 text-blue-500" />
        <div>
          <p className="text-[14px] font-semibold text-blue-800">Fonctionnalité en cours de développement</p>
          <p className="mt-1 text-[12px] leading-5 text-blue-700">Les réglages d’apparence seront activés dans une prochaine version.</p>
        </div>
      </div>
    </div>
  );
}
