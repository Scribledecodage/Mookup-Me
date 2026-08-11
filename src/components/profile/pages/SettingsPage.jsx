'use client';

const SETTING_DETAILS = {
  visibilite: {
    title: 'Visibilité',
    description: 'Choisissez qui peut voir votre profil public.',
    items: ['Profil public', 'Statut et activité', 'Informations personnelles'],
  },
  securite: {
    title: 'Mot de passe et sécurité',
    description: 'Protégez votre compte et gérez vos options de connexion.',
    items: ['Mot de passe', 'Double authentification', 'Sessions actives'],
  },
  familial: {
    title: 'Centre familial',
    description: 'Gérez les options de contrôle parental et le partage en famille.',
    items: ['Contrôle parental', 'Membres de la famille'],
  },
  'donnees-confidentialite': {
    title: 'Données et confidentialité',
    description: 'Contrôlez les données enregistrées et leur utilisation.',
    items: ['Données personnelles', 'Télécharger mes données', 'Supprimer mes données'],
  },
  'permissions-messagerie': {
    title: 'Permissions de messagerie',
    description: 'Choisissez qui peut vous contacter et vous ajouter à un groupe.',
    items: ['Messages privés', 'Invitations de groupe'],
  },
  'confidentialite-activites': {
    title: 'Confidentialité des activités',
    description: 'Contrôlez ce que vos contacts peuvent voir de votre activité.',
    items: ['Présence en ligne', 'Dernière activité', 'Confirmations de lecture'],
  },
  notifications: {
    title: 'Notifications',
    description: 'Personnalisez les alertes que vous recevez.',
    items: ['Messages et groupes', 'Appels', 'Sons et vibrations'],
  },
  apparence: {
    title: 'Apparence',
    description: 'Adaptez l’affichage de Mookup à vos préférences.',
    items: ['Thème', 'Taille du texte', 'Densité d’affichage'],
  },
  'voix-video': {
    title: 'Voix & Vidéo',
    description: 'Configurez votre microphone, votre caméra et vos appels.',
    items: ['Microphone', 'Caméra', 'Qualité des appels'],
  },
  accessibilite: {
    title: 'Accessibilité',
    description: 'Activez les options qui rendent l’application plus confortable.',
    items: ['Réduire les animations', 'Contraste renforcé', 'Navigation au clavier'],
  },
  systeme: {
    title: 'Système',
    description: 'Gérez les préférences techniques de l’application.',
    items: ['Démarrage automatique', 'Stockage local', 'Version de l’application'],
  },
  'langue-heure': {
    title: 'Langue et heure',
    description: 'Choisissez votre langue et votre fuseau horaire.',
    items: ['Langue de l’application', 'Fuseau horaire', 'Format de date'],
  },
  developpeur: {
    title: 'Développeur',
    description: 'Accédez aux outils et options avancées.',
    items: ['Mode développeur', 'Clés et intégrations'],
  },
};

export default function SettingsPage({ section }) {
  const details = SETTING_DETAILS[section] || {
    title: 'Réglages',
    description: 'Personnalisez votre expérience Mookup.',
    items: [],
  };

  return (
    <div className="p-6 w-full max-w-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">{details.title}</h2>
        <p className="text-gray-500 text-[15px]">{details.description}</p>
      </div>
      <div className="space-y-2">
        {details.items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => alert('Cette option sera bientôt disponible !')}
            className="w-full flex items-center justify-between gap-4 px-4 py-3.5 bg-gray-50 hover:bg-blue-50 border border-gray-100 rounded-xl text-left transition-colors"
          >
            <span className="text-[14px] text-gray-800">{item}</span>
            <span className="text-[12px] text-gray-400">Bientôt</span>
          </button>
        ))}
      </div>
    </div>
  );
}
