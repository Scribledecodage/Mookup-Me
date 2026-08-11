'use client';

import { Cookie, Scales, ShieldCheck } from '@phosphor-icons/react';

const LEGAL_ICONS = {
  'conditions-utilisation': Scales,
  confidentialite: ShieldCheck,
  cookies: Cookie,
};

const LEGAL_EYEBROWS = {
  'conditions-utilisation': 'LES RÈGLES DE MOOKUP',
  confidentialite: 'VOTRE VIE PRIVÉE',
  cookies: 'COOKIES ET PRÉFÉRENCES',
};

const LEGAL_PAGES = {
  'conditions-utilisation': {
    title: 'Conditions d’utilisation',
    intro: 'Ces règles garantissent un espace sûr, respectueux et agréable pour tout le monde.',
    sections: [
      { title: 'Respect et sécurité', text: 'Les insultes, le harcèlement, les menaces, la haine, la discrimination et tout contenu illégal sont interdits. Les contenus signalés peuvent être filtrés, masqués ou supprimés, et les comptes peuvent être suspendus ou bannis.' },
      { title: 'Protection des échanges', text: 'Les données et les échanges sont protégés par des mesures de sécurité et de chiffrement adaptées. Ne partage jamais de mot de passe ou d’information sensible dans une conversation.' },
      { title: 'BDD Bot et fonctions IA', text: 'BDD Bot et les fonctions d’IA peuvent générer des réponses automatiques. Leurs réponses peuvent être imparfaites et ne remplacent pas un avis professionnel.' },
    ],
  },
  confidentialite: {
    title: 'Politique de confidentialité',
    intro: 'Nous protégeons votre vie privée et limitons l’utilisation des informations au fonctionnement du service.',
    sections: [
      { title: 'Aucune revente de données', text: 'Nous ne vendons ni ne louons vos données et nous ne créons pas de profil publicitaire à partir de votre activité.' },
      { title: 'Utilisation limitée', text: 'Les informations nécessaires au compte, à la messagerie et à vos réglages servent uniquement à fournir et sécuriser Mookup.' },
      { title: 'BDD Bot et IA', text: 'Les données ne sont pas utilisées pour entraîner une intelligence artificielle. Pour rester prudent, ne transmets pas de données personnelles ou confidentielles à un outil automatisé.' },
      { title: 'Vos droits', text: 'Vous pouvez demander l’accès, la correction ou la suppression des informations associées à votre compte.' },
    ],
  },
  cookies: {
    title: 'Politique relative aux cookies',
    intro: 'Les cookies servent uniquement à faire fonctionner Mookup correctement et à mémoriser vos préférences.',
    sections: [
      { title: 'Cookies essentiels', text: 'Ils peuvent être nécessaires pour la connexion, la sécurité de la session et le bon fonctionnement de l’application.' },
      { title: 'Pas de cookies publicitaires', text: 'Nous n’utilisons pas de cookies publicitaires et nous ne revendons pas votre activité à des annonceurs.' },
      { title: 'Vos préférences', text: 'Vous pouvez gérer ou supprimer les cookies depuis les réglages de votre navigateur. Certaines fonctions peuvent alors ne plus fonctionner correctement.' },
    ],
  },
};

export default function LegalPage({ section }) {
  const page = LEGAL_PAGES[section] || LEGAL_PAGES['conditions-utilisation'];
  const Icon = LEGAL_ICONS[section] || ShieldCheck;
  const eyebrow = LEGAL_EYEBROWS[section] || 'INFORMATIONS LÉGALES';

  return (
    <div className="p-6 pb-12 w-full max-w-2xl">
      <div className="mb-6 flex min-w-0 items-start gap-3 sm:gap-4">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[#5046e5]/10 text-[#5046e5] sm:h-12 sm:w-12">
          <Icon size={24} weight="duotone" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#5046e5]">{eyebrow}</p>
          <h2 className="break-words text-2xl font-semibold tracking-tight text-gray-900">{page.title}</h2>
          <p className="mt-3 text-gray-500 text-[15px]">{page.intro}</p>
        </div>
      </div>
      <div className="space-y-3">
        {page.sections.map((item) => (
          <section key={item.title} className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
            <h3 className="text-[15px] font-semibold text-gray-800 mb-1">{item.title}</h3>
            <p className="text-[14px] leading-6 text-gray-600">{item.text}</p>
          </section>
        ))}
      </div>
      <p className="mt-6 text-[12px] leading-5 text-gray-400">
        Cette page présente les engagements de Mookup en matière de sécurité et de respect de la vie privée.
      </p>
    </div>
  );
}
