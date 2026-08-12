import { notFound } from 'next/navigation';
import Home from '../page';

const PROFILE_SECTIONS = new Set([
  'infos',
  'securite',
  'statut',
  'familial',
  'donnees-confidentialite',
  'permissions-messagerie',
  'notifications',
  'voix-video',
  'apparence',
  'accessibilite',
  'systeme',
  'langue-heure',
  'confidentialite-activites',
  'activite-desktop',
  'applications-connectees',
  'application-windows',
  'developpeur',
  'bio',
  'visibilite',
  'connexions',
  'conditions-utilisation',
  'confidentialite',
  'cookies',
  'administration',
]);

const USER_ID_PATTERN = /^[A-Za-z0-9_-]{20,128}$/;
const FIREBASE_DOCUMENT_ID_PATTERN = /^[A-Za-z0-9]{20}$/;

function isKnownDiscussionId(type: string, id: string): boolean {
  if (type === 'groupe') {
    return id === 'general' || FIREBASE_DOCUMENT_ID_PATTERN.test(id);
  }

  if (type === 'privee') {
    return /^private_[A-Za-z0-9-]{20,128}_[A-Za-z0-9-]{20,128}$/.test(id);
  }

  if (type === 'bot') {
    return /^ai-[A-Za-z0-9_-]{20,128}$/.test(id)
      || /^botchat_[A-Za-z0-9_-]{20,128}_[A-Za-z0-9]{20}$/.test(id);
  }

  return false;
}

function isKnownAppRoute(slug: string[]): boolean {
  if (slug.length === 1) {
    return ['accueil', 'connexion', 'discussions', 'recherche', 'statuts', 'appels', 'bots', 'profil'].includes(slug[0]);
  }

  if (slug[0] === 'discussions' && slug.length === 3) {
    return isKnownDiscussionId(slug[1], slug[2]);
  }

  if (slug[0] === 'statuts' && slug.length === 3) {
    return (slug[1] === 'creer' && ['texte', 'media'].includes(slug[2]))
      || (slug[1] === 'voir' && USER_ID_PATTERN.test(slug[2]));
  }

  if (slug[0] === 'bots' && slug.length === 2) {
    return ['applications', 'statistiques'].includes(slug[1]);
  }

  if (slug[0] === 'profil' && slug.length === 2) {
    return PROFILE_SECTIONS.has(slug[1]);
  }

  return false;
}

type AppRouteProps = {
  params: Promise<{ slug: string[] }>;
};

export default async function AppRoute({ params }: AppRouteProps) {
  const { slug } = await params;
  if (!isKnownAppRoute(slug)) notFound();
  return <Home />;
}
