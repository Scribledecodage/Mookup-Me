export type LegalKind = 'conditions-utilisation' | 'confidentialite' | 'cookies';

export const LEGAL_NOTE = 'Cette page présente les engagements de Mookup en matière de sécurité et de respect de la vie privée.';

export const LEGAL_CONTENT: Record<LegalKind, {
  title: string;
  intro: string;
  sections: { title: string; text: string }[];
}> = {
  'conditions-utilisation': {
    title: 'Conditions d’utilisation',
    intro: 'Ces règles garantissent un espace sûr, respectueux et agréable pour tout le monde.',
    sections: [
      {
        title: 'Respect et sécurité',
        text: 'Les insultes, le harcèlement, les menaces, la haine, la discrimination et tout contenu illégal sont interdits. Les contenus signalés peuvent être filtrés, masqués ou supprimés, et les comptes peuvent être suspendus ou bannis.',
      },
      {
        title: 'Protection des échanges',
        text: 'Les données et les échanges sont protégés par des mesures de sécurité et de chiffrement adaptées. Ne partage jamais de mot de passe ou d’information sensible dans une conversation.',
      },
      {
        title: 'BDD Bot et fonctions IA',
        text: 'BDD Bot et les fonctions d’IA peuvent générer des réponses automatiques. Leurs réponses peuvent être imparfaites et ne remplacent pas un avis professionnel.',
      },
    ],
  },
  confidentialite: {
    title: 'Politique de confidentialité',
    intro: 'Nous protégeons votre vie privée et limitons l’utilisation des informations au fonctionnement du service.',
    sections: [
      {
        title: 'Aucune revente de données',
        text: 'Nous ne vendons ni ne louons vos données et nous ne créons pas de profil publicitaire à partir de votre activité.',
      },
      {
        title: 'Utilisation limitée',
        text: 'Les informations nécessaires au compte, à la messagerie et à vos réglages servent uniquement à fournir et sécuriser Mookup.',
      },
      {
        title: 'BDD Bot et IA',
        text: 'Les données ne sont pas utilisées pour entraîner une intelligence artificielle. Pour rester prudent, ne transmets pas de données personnelles ou confidentielles à un outil automatisé.',
      },
      {
        title: 'Vos droits',
        text: 'Vous pouvez demander l’accès, la correction ou la suppression des informations associées à votre compte.',
      },
    ],
  },
  cookies: {
    title: 'Politique relative aux cookies',
    intro: 'Les cookies servent uniquement à faire fonctionner Mookup correctement et à mémoriser vos préférences.',
    sections: [
      {
        title: 'Cookies essentiels',
        text: 'Ils peuvent être nécessaires pour la connexion, la sécurité de la session et le bon fonctionnement de l’application.',
      },
      {
        title: 'Pas de cookies publicitaires',
        text: 'Nous n’utilisons pas de cookies publicitaires et nous ne revendons pas votre activité à des annonceurs.',
      },
      {
        title: 'Vos préférences',
        text: 'Vous pouvez gérer ou supprimer les cookies depuis les réglages de votre navigateur. Certaines fonctions peuvent alors ne plus fonctionner correctement.',
      },
    ],
  },
};
