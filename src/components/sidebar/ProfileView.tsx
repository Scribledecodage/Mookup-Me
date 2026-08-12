'use client';

import React, { useState, useEffect, useRef } from 'react';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import {
  MagnifyingGlass,
  Key,
  UserCircle,
  IdentificationCard,
  Lock,
  Info,
  Users,
  Globe,
  AddressBook,
  ShieldCheck,
  ChatCircle,
  Bell,
  Microphone,
  Palette,
  Keyboard,
  Translate,
  Link,
  Code,
  Cookie,
  FileText,
  Scales,
  SignOut,
  PencilLine,
  CaretRight,
} from '@phosphor-icons/react';
import UserAvatar from '@/components/ui/UserAvatar';

export type ProfileSection =
  | 'infos'
  | 'securite'
  | 'statut'
  | 'familial'
  | 'donnees-confidentialite'
  | 'permissions-messagerie'
  | 'notifications'
  | 'voix-video'
  | 'apparence'
  | 'accessibilite'
  | 'systeme'
  | 'langue-heure'
  | 'confidentialite-activites'
  | 'applications-connectees'
  | 'developpeur'
  | 'bio'
  | 'visibilite'
  | 'connexions'
  | 'conditions-utilisation'
  | 'confidentialite'
  | 'cookies'
  | 'administration';

// Les réglages sont séparés en rubriques courtes pour garder le profil lisible.
const SECTIONS = [
  {
    id: 'compte' as const,
    label: 'Compte',
    desc: 'Photo de profil, pseudo et sécurité',
    icon: Key,
    items: [
      { id: 'infos'    as ProfileSection, label: 'Infos du compte',          desc: 'Pseudo, email, photo de profil',        icon: IdentificationCard },
      { id: 'securite' as ProfileSection, label: 'Mot de passe et sécurité', desc: 'Mot de passe, double authentification', icon: Lock               },
    ],
  },
  {
    id: 'public' as const,
    label: 'Profil public',
    desc: 'Bio, statut, passions et visibilité',
    icon: UserCircle,
    items: [
      { id: 'statut'     as ProfileSection, label: 'Statut',          desc: 'Activité et présence en ligne',       icon: Info        },
      { id: 'bio'        as ProfileSection, label: 'Bio & passions',  desc: 'Description, anniversaire, ville…',   icon: Globe       },
      { id: 'visibilite' as ProfileSection, label: 'Visibilité',      desc: 'Qui peut voir votre profil public',   icon: AddressBook },
    ],
  },
  {
    id: 'confidentialite' as const,
    label: 'Confidentialité',
    desc: 'Données, contacts et vie privée',
    icon: ShieldCheck,
    items: [
      { id: 'familial'                as ProfileSection, label: 'Centre familial',                  desc: 'Contrôle parental, partage famille', icon: Users       },
      { id: 'donnees-confidentialite' as ProfileSection, label: 'Données et confidentialité',      desc: 'Protection de vos données',         icon: ShieldCheck },
      { id: 'permissions-messagerie'  as ProfileSection, label: 'Permissions de messagerie',       desc: 'Qui peut vous contacter',           icon: ChatCircle  },
      { id: 'confidentialite-activites' as ProfileSection, label: 'Confidentialité des activités', desc: 'Contrôle de votre activité',        icon: ShieldCheck },
    ],
  },
  {
    id: 'preferences' as const,
    label: 'Préférences',
    desc: 'Notifications, affichage et accessibilité',
    icon: Palette,
    items: [
      { id: 'notifications' as ProfileSection, label: 'Notifications', desc: 'Alertes et notifications', icon: Bell       },
      { id: 'apparence'     as ProfileSection, label: 'Apparence',     desc: 'Thème et affichage',       icon: Palette    },
      { id: 'voix-video'    as ProfileSection, label: 'Voix & Vidéo',  desc: 'Microphone et caméra',     icon: Microphone },
      { id: 'accessibilite' as ProfileSection, label: 'Accessibilité', desc: 'Options d’accessibilité',   icon: UserCircle },
      { id: 'langue-heure'  as ProfileSection, label: 'Langue et heure', desc: 'Langue, fuseau horaire',  icon: Translate  },
      { id: 'systeme'       as ProfileSection, label: 'Système',       desc: 'Préférences système',       icon: Keyboard   },
    ],
  },
  {
    id: 'connexions' as const,
    label: 'Connexions',
    desc: 'Applications et outils connectés',
    icon: Link,
    items: [
      { id: 'applications-connectees' as ProfileSection, label: 'Applications connectées', desc: 'Gérer les connexions',       icon: Link },
      { id: 'developpeur'             as ProfileSection, label: 'Développeur',              desc: 'Outils et options avancées', icon: Code },
    ],
  },
  {
    id: 'administration' as const,
    label: 'Administration',
    desc: 'Accès réservé à l’équipe Mookup',
    icon: ShieldCheck,
    items: [
      { id: 'administration' as ProfileSection, label: 'Espace administrateur', desc: 'Connexion et tableau de bord', icon: Lock },
    ],
  },
  {
    id: 'informations-legales' as const,
    label: 'Informations légales',
    desc: 'Conditions, confidentialité et cookies',
    icon: FileText,
    items: [
      { id: 'conditions-utilisation' as ProfileSection, label: 'Conditions d’utilisation',        desc: 'Règles et sécurité de la plateforme', icon: Scales      },
      { id: 'confidentialite'        as ProfileSection, label: 'Politique de confidentialité',    desc: 'Protection de vos données',           icon: ShieldCheck },
      { id: 'cookies'                as ProfileSection, label: 'Politique relative aux cookies', desc: 'Cookies essentiels et préférences',   icon: Cookie     },
    ],
  },
];

interface ProfileViewProps {
  user?: any;
  activeSection?: ProfileSection;
  onSelectSection?: (section: ProfileSection) => void;
  onMobileNavigate?: (section: ProfileSection) => void;
  hideActiveStyle?: boolean;
}

export default function ProfileView({
  user,
  activeSection = 'infos',
  onSelectSection,
  onMobileNavigate,
  hideActiveStyle = false,
}: ProfileViewProps) {
  const [search, setSearch] = useState('');
  // Compte ouvert par défaut, Profil public fermé
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['compte']));

  // Sélectionner infos au premier montage — via useEffect pour éviter setState pendant le render
  const didInit = useRef(false);
  useEffect(() => {
    if (!didInit.current) {
      didInit.current = true;
      onSelectSection?.('infos');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClick = (id: ProfileSection) => {
    onSelectSection?.(id);
    onMobileNavigate?.(id);
  };

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => {
      const next = new Set<string>();
      if (!prev.has(sectionId)) {
        // ouvre celle-ci, ferme toutes les autres
        next.add(sectionId);
        const section = SECTIONS.find(s => s.id === sectionId);
        const selectedId = sectionId === 'connexions' ? 'connexions' : section?.items[0]?.id;
        const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
        if (selectedId && !isMobile) {
          setTimeout(() => {
            onSelectSection?.(selectedId as ProfileSection);
            onMobileNavigate?.(selectedId as ProfileSection);
          }, 0);
        }
      }
      // si elle était déjà ouverte → next est vide = tout fermé
      return next;
    });
  };

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Utilisateur';
  const q = search.toLowerCase();

  const handleLogout = async () => {
    if (!window.confirm('Voulez-vous vraiment vous déconnecter ?')) return;
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  return (
    <div className="flex flex-col bg-white w-full h-full">

      {/* ── Avatar + nom ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 flex-shrink-0">
        <UserAvatar
          uid={user?.uid || ''}
          photoURL={user?.photoURL}
          displayName={displayName}
          size={44}
        />
        <div className="flex flex-col min-w-0">
          <span className="text-[15px] font-semibold text-gray-900 truncate">{displayName}</span>
          <button
            type="button"
            onClick={() => {
              handleClick('infos');
              window.dispatchEvent(new CustomEvent('change_profile_photo'));
            }}
            className="flex items-center gap-1 text-[13px] text-blue-600 hover:text-blue-700 transition-colors text-left"
          >
            <PencilLine size={13} />
            Modifier le profil
          </button>
        </div>
      </div>

      {/* ── Barre de recherche ───────────────────────────────────── */}
      <div className="px-3 py-3 flex-shrink-0">
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
          <MagnifyingGlass size={16} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Rechercher"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-[14px] text-gray-700 placeholder-gray-400 outline-none w-full"
          />
        </div>
      </div>

      {/* ── Liste scrollable ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {SECTIONS.map(section => {
          const SectionIcon = section.icon;
          const isOpen = openSections.has(section.id);

          const visibleItems = q
            ? section.items.filter(i =>
                i.label.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q)
              )
            : section.items;

          if (q && visibleItems.length === 0) return null;

          return (
            <div
              key={section.id}
              className="mb-1"
            >

              {/* Bouton de section — pleine largeur */}
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-left transition-colors hover:bg-gray-100 active:bg-gray-200 cursor-pointer"
              >
                <div className="flex items-center justify-center w-6 text-gray-500 flex-shrink-0">
                  <SectionIcon size={22} />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span
                    className="text-[15px] font-medium text-gray-900"
                    style={{ fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif' }}
                  >
                    {section.label}
                  </span>
                  <span className="text-[13px] text-gray-500 truncate">{section.desc}</span>
                </div>
                {/* indicateur ouvert/fermé */}
                <CaretRight size={14} className={`text-gray-400 transition-transform duration-150 flex-shrink-0 ${isOpen ? 'rotate-90' : ''}`} />
              </button>

              {/* Sous-items avec barre verticale gauche — animés */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateRows: (isOpen || q) ? '1fr' : '0fr',
                  transition: 'grid-template-rows 220ms ease',
                }}
              >
                <div className="overflow-hidden">
                  <div className="ml-[21px] border-l-2 border-gray-200 pl-2 flex flex-col gap-0.5 mb-1">
                    {visibleItems.map(item => {
                      const Icon = item.icon;
                      const isActive = !hideActiveStyle && activeSection === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleClick(item.id)}
                          className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-left transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-gray-200 text-gray-900'
                              : 'text-gray-600 hover:bg-gray-100 active:bg-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-center w-6 text-gray-500 flex-shrink-0">
                            <Icon size={22} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span
                              className={`text-[15px] ${isActive ? 'font-medium text-gray-900' : 'font-normal text-gray-800'}`}
                              style={{ fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif' }}
                            >
                              {item.label}
                            </span>
                            <span className="text-[13px] text-gray-500 truncate">{item.desc}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* ── Déconnexion toujours accessible en bas ────────────────── */}
      <div className="flex-shrink-0 px-3 pt-2 pb-3 border-t border-gray-100 bg-white">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors cursor-pointer"
        >
          <SignOut size={22} />
          <span className="text-[15px] font-medium">Déconnexion</span>
        </button>
      </div>

    </div>
  );
}
