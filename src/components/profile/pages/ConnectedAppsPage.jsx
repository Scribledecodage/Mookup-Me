'use client';

import { ArrowRight, CheckCircle } from '@phosphor-icons/react';

const CONNECTION_OPTIONS = [
  { name: 'Bluesky', slug: 'bluesky', color: '0085FF' },
  { name: 'PayPal', slug: 'paypal', color: '003087' },
  { name: 'Reddit', slug: 'reddit', color: 'FF4500' },
  { name: 'Steam', slug: 'steam', color: '171A21' },
  { name: 'X', slug: 'x', color: '000000' },
  { name: 'eBay', slug: 'ebay', color: 'E53238' },
  { name: 'Crunchyroll', slug: 'crunchyroll', color: 'F47521' },
  { name: 'PlayStation', slug: 'playstation', color: '003791' },
  { name: 'Spotify', slug: 'spotify', color: '1DB954' },
];

export default function ConnectedAppsPage({ title = 'Applications connectées' }) {
  return (
    <div className="p-6 pb-12 w-full max-w-3xl">
      <div className="mb-8">
        <h2 className="text-2xl font-normal text-gray-900 mb-1">{title}</h2>
        <p className="max-w-2xl text-[15px] leading-6 text-gray-600">
          Connectez Spotify, PlayStation ou Steam à Mookup. Affichez votre activité en direct. Partagez aussi vos réseaux avec vos contacts. Retrouvez toutes vos connexions au même endroit.
        </p>
      </div>

      <div>
        <h3 className="text-[17px] font-semibold text-gray-900 mb-4">Ajouter une nouvelle connexion</h3>
        <div className="flex flex-wrap items-center gap-2.5">
          {CONNECTION_OPTIONS.map((connection) => (
            <button
              key={connection.name}
              type="button"
              aria-label={`Connecter ${connection.name}`}
              className="flex h-14 w-14 items-center justify-center rounded-xl border border-gray-200 bg-gray-100 p-2 transition-colors hover:bg-gray-200"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white">
                <img
                  src={`https://cdn.simpleicons.org/${connection.slug}/${connection.color}`}
                  alt=""
                  className="h-7 w-7 object-contain"
                />
              </span>
            </button>
          ))}
          <button
            type="button"
            aria-label="Voir plus de connexions"
            className="flex h-14 w-14 items-center justify-center rounded-xl border border-gray-200 bg-gray-100 text-gray-800 transition-colors hover:bg-gray-200"
          >
            <ArrowRight size={24} />
          </button>
        </div>
      </div>

      <div className="mt-10 border-t border-gray-200 pt-8">
        <h3 className="mb-4 text-[17px] font-semibold text-gray-900">Application intégrée</h3>
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 bg-gray-50 p-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#5046e5]/10 p-1.5">
              <img src="/BDDBOT.png" alt="Logo de BDD Bot" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-[17px] font-semibold text-gray-900">BDD Bot</h4>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">Intégré</span>
              </div>
              <p className="mt-1 text-[13px] text-gray-500">Assistant IA intégré à l’expérience Mookup.</p>
            </div>
          </div>
          <div className="space-y-3 p-4">
            <p className="text-[13px] leading-5 text-gray-600">BDD Bot est conçu pour aider les utilisateurs dans leurs échanges et leurs tâches directement dans Mookup.</p>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 text-[12px]">
              <span className="flex items-center gap-1.5 font-medium text-gray-700"><CheckCircle size={15} className="text-blue-500" /> Développé par l’équipe Mookup</span>
              <span className="text-gray-400">Intégration système · Non supprimable</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
