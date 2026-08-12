'use client';

import { auth, db } from '@/lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, addDoc, serverTimestamp, updateDoc, arrayRemove } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { usePathname } from 'next/navigation';
import Chat from '@/components/Chat';
import HomeView from '@/components/HomeView';
import CallHandler from '@/components/CallHandler';
import BotPage from '@/components/bots/BotPage';
import ProfilePage from '@/components/profile/ProfilePage';
import MyProfilePresentation from '@/components/profile/MyProfilePresentation';
import { useState, useEffect, useRef } from 'react';
import { Eye, EyeSlash, Lock, Envelope, WindowsLogo, User, UserFocus, UsersThree, CaretLeft } from '@phosphor-icons/react';
import type { BotSection } from '@/components/sidebar/BotView';
import type { ProfileSection } from '@/components/sidebar/ProfileView';

const TAB_PATHS: Record<string, string> = {
  discussion: '/accueil',
  commu: '/recherche',
  actus: '/statuts',
  appels: '/appels',
  bots: '/bots',
  profil: '/profil',
};

const BOT_SECTION_PATHS: Record<BotSection, string> = {
  accueil: '/bots',
  applications: '/bots/applications',
  statistiques: '/bots/statistiques',
};

const PROFILE_SECTION_PATHS: Record<ProfileSection, string> = {
  infos: '/profil/infos',
  securite: '/profil/securite',
  statut: '/profil/statut',
  familial: '/profil/familial',
  'donnees-confidentialite': '/profil/donnees-confidentialite',
  'permissions-messagerie': '/profil/permissions-messagerie',
  notifications: '/profil/notifications',
  'voix-video': '/profil/voix-video',
  apparence: '/profil/apparence',
  accessibilite: '/profil/accessibilite',
  systeme: '/profil/systeme',
  'langue-heure': '/profil/langue-heure',
  'confidentialite-activites': '/profil/confidentialite-activites',
  'applications-connectees': '/profil/applications-connectees',
  developpeur: '/profil/developpeur',
  bio: '/profil/bio',
  visibilite: '/profil/visibilite',
  connexions: '/profil/connexions',
  'conditions-utilisation': '/profil/conditions-utilisation',
  confidentialite: '/profil/confidentialite',
  cookies: '/profil/cookies',
  administration: '/profil/administration',
};

type AppRouteState = {
  tab: string;
  chatId: string | null;
  botSection: BotSection;
  profileSection: ProfileSection;
};

function decodeRoutePart(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getAppRouteState(pathname: string | null): AppRouteState {
  const path = pathname || '/';
  const parts = path.split('/').filter(Boolean);
  const state: AppRouteState = {
    tab: getTabFromPath(path),
    chatId: null,
    botSection: 'accueil',
    profileSection: 'infos',
  };

  if (parts[0] === 'discussions' && parts[2]) {
    state.chatId = decodeRoutePart(parts[2]);
  }
  if (parts[0] === 'bots' && parts[1] && Object.entries(BOT_SECTION_PATHS).some(([, sectionPath]) => sectionPath === `/${parts.slice(0, 2).join('/')}`)) {
    state.botSection = parts[1] as BotSection;
  }
  if (parts[0] === 'profil' && parts[1] && Object.entries(PROFILE_SECTION_PATHS).some(([, sectionPath]) => sectionPath === `/${parts.slice(0, 2).join('/')}`)) {
    state.profileSection = parts[1] as ProfileSection;
  }

  return state;
}

type PublicAuthMode = 'connexion' | 'inscription';

function getPublicAuthMode(pathname: string | null, search = ''): PublicAuthMode | null {
  if (pathname === '/connexion') return 'connexion';
  const mode = new URLSearchParams(search).get('auth');
  return mode === 'connexion' || mode === 'inscription' ? mode : null;
}

function getTabFromPath(pathname: string | null): string {
  if (!pathname || pathname === '/') return 'discussion';
  if (pathname.startsWith('/recherche')) return 'commu';
  if (pathname.startsWith('/statuts')) return 'actus';
  if (pathname.startsWith('/appels')) return 'appels';
  if (pathname.startsWith('/bots')) return 'bots';
  if (pathname.startsWith('/profil')) return 'profil';
  if (pathname.startsWith('/discussions') || pathname.startsWith('/accueil')) return 'discussion';
  return 'discussion';
}

// ─── Salutation animée ──────────────────────────────────────────────────────

function getGreeting(): { text: string; emoji: string } {
  const h = new Date().getHours();
  if (h >= 0 && h < 2)   return { text: 'Toujours réveillé ? Il est tard, prends soin de toi.',              emoji: '🌙' };
  if (h >= 2 && h < 4)   return { text: 'Encore réveillé à cette heure-ci ? Respecte aussi ton sommeil.',   emoji: '🌌' };
  if (h >= 4 && h < 6)   return { text: 'Déjà debout ? Le monde dort encore, belle énergie !',             emoji: '🌅' };
  if (h >= 6 && h < 8)   return { text: 'Bonjour, bon réveil ! Que ta journée commence bien.',             emoji: '☀️' };
  if (h >= 8 && h < 10)  return { text: 'Belle matinée, prêt à démarrer tranquillement ?',               emoji: '🌤️' };
  if (h >= 10 && h < 12) return { text: 'Bonne matinée, ça avance bien de ton côté ?',                   emoji: '✨' };
  if (h >= 12 && h < 14) return { text: 'Bon appétit ! Prends le temps de faire une vraie pause.',        emoji: '🍽️' };
  if (h >= 14 && h < 16) return { text: 'Bon après-midi, on garde le rythme sans se presser ?',          emoji: '🌿' };
  if (h >= 16 && h < 18) return { text: 'Bonne fin d’après-midi, encore un petit effort ?',              emoji: '🌇' };
  if (h >= 18 && h < 20) return { text: 'Belle soirée, profite bien de ce moment pour toi.',               emoji: '🌆' };
  if (h >= 20 && h < 22) return { text: 'Bonne soirée, prends un peu de temps pour souffler.',             emoji: '🌃' };
  return                       { text: 'Bonne nuit… ou encore un dernier tour avant de dormir ?',          emoji: '🦉' };
}

const PUBLIC_CONSOLE_MESSAGE = "Salut 👋 merci de ne pas modifier mon code, je galère dessus… Mais bon amuse-toi si tu veux, juste pas n’importe quoi 😄 Et pour info, Minecraft est meilleur que tous les autres jeux.";

function WelcomePanel() {
  const { text, emoji } = getGreeting();
  const full = text;
  const [displayed, setDisplayed] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const indexRef = useRef(0);

  // La version est demandée au serveur à chaque ouverture de la page et au retour
  // sur l’onglet : aucune version ni URL GitHub n’est figée dans le frontend.
  const [latestWindowsVersion, setLatestWindowsVersion] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const checkLatestWindowsVersion = async () => {
      try {
        const response = await fetch('/api/download/windows?info=1', { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json() as { version?: string };
        if (active && data.version) setLatestWindowsVersion(data.version);
      } catch {
        // Le téléchargement reste disponible même si l’étiquette de version ne se charge pas.
      }
    };

    void checkLatestWindowsVersion();
    window.addEventListener('focus', checkLatestWindowsVersion);
    return () => {
      active = false;
      window.removeEventListener('focus', checkLatestWindowsVersion);
    };
  }, []);

  // ── Typewriter ───────────────────────────────────────────────────────────
  useEffect(() => {
    setDisplayed('');
    setShowEmoji(false);
    indexRef.current = 0;
    const speed = 48;
    const timer = setInterval(() => {
      indexRef.current += 1;
      setDisplayed(full.slice(0, indexRef.current));
      if (indexRef.current >= full.length) {
        clearInterval(timer);
        setTimeout(() => setShowEmoji(true), 120);
      }
    }, speed);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
    <div className="public-welcome-panel hidden md:flex h-full flex-col bg-[#f9f9f9]">
      {/* Logo */}
      <div className="flex items-center justify-center gap-2.5 pt-8 pb-2 flex-shrink-0">
        <img src="/Logo.png" alt="Mookup" width={32} height={32} className="block flex-shrink-0" />
        <span className="text-[20px] font-light text-gray-800 tracking-wide" style={{ fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif' }}>
          Mookup
        </span>
      </div>
      <div className="w-16 h-px bg-gray-200 mx-auto" />

      {/* Actions */}
      <div className="flex items-center justify-center flex-1">
        <div className="flex justify-center gap-8 md:gap-12 max-w-[600px] w-full mt-6">

          {/* Créer un groupe */}
          <div
            className="flex flex-col items-center gap-3 cursor-pointer group"
            onClick={() => window.dispatchEvent(new CustomEvent('welcome_create_group'))}
          >
            <div className="w-16 h-11 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 transition-all shadow-sm">
              <UsersThree size={22} className="text-gray-800" />
            </div>
            <span className="text-[13px] font-medium text-gray-700">Créer un groupe</span>
          </div>

          {/* Rechercher un contact */}
          <div className="flex flex-col items-center gap-3 cursor-pointer group">
            <div className="w-16 h-11 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 transition-all shadow-sm">
              <UserFocus size={22} className="text-gray-800" />
            </div>
            <span className="text-[13px] font-medium text-gray-700">Rechercher un contact</span>
          </div>

          {/* Installer l'application Windows */}
          <a
            href="/api/download/windows"
            download
            title={latestWindowsVersion ? `Télécharger Mookup ${latestWindowsVersion}` : 'Télécharger la dernière version Windows'}
            className="flex flex-col items-center gap-3 cursor-pointer group"
          >
            <div className="w-16 h-11 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 transition-all shadow-sm">
              <WindowsLogo size={22} weight="regular" className="text-gray-800" />
            </div>
            <span className="text-[13px] font-medium text-gray-700 text-center">
              Installer l&apos;application Windows
              {latestWindowsVersion && <span className="block text-[10px] font-normal text-gray-400">{latestWindowsVersion}</span>}
            </span>
          </a>

        </div>
      </div>

      {/* Salutation */}
      <div className="flex flex-col items-center pb-10 flex-shrink-0 select-none">
        <p
          className="text-[22px] font-light text-gray-600 tracking-tight"
          style={{ fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif', minHeight: '1.5em' }}
        >
          {displayed}
          {displayed.length < full.length && (
            <span
              className="inline-block w-[2px] h-[1.1em] bg-gray-400 ml-[2px] align-middle"
              style={{ animation: 'blink 0.7s step-end infinite' }}
            />
          )}
          {showEmoji && (
            <span className="ml-2 inline-block" style={{ animation: 'popIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
              {emoji}
            </span>
          )}
        </p>
        <style>{`
          @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
          @keyframes popIn { from{opacity:0;transform:scale(0.5)} to{opacity:1;transform:scale(1)} }
        `}</style>
      </div>
    </div>

    </>
  );
}

export default function Home() {
  const pathname = usePathname();
  const [user, loading] = useAuthState(auth);

  // Les actions de la Jump List Windows arrivent dans l’URL de l’application.
  // Le groupe est un panneau interne : on transmet donc une fois l’action à HomeView.
  useEffect(() => {
    if (!user || typeof window === 'undefined') return;

    const action = new URLSearchParams(window.location.search).get('desktopAction');
    if (action !== 'create-group') return;

    const timer = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('welcome_create_group'));
      window.history.replaceState({ appTab: 'discussion' }, '', TAB_PATHS.discussion);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [user]);
  const initialRoute = getAppRouteState(typeof window === 'undefined' ? pathname : window.location.pathname);
  const initialPublicAuthMode = getPublicAuthMode(
    typeof window === 'undefined' ? pathname : window.location.pathname,
    typeof window === 'undefined' ? '' : window.location.search
  );
  const publicConsoleMessageLoggedRef = useRef(false);
  const [selectedChat, setSelectedChat] = useState<string | null>(initialRoute.chatId);
  const [selectedChatData, setSelectedChatData] = useState<{ name: string, avatar?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<string>(initialRoute.tab);
  const [botSection, setBotSection] = useState<BotSection>(initialRoute.botSection);
  const [profileSection, setProfileSection] = useState<ProfileSection>(initialRoute.profileSection);
  // Sur mobile : contenu ouvert depuis BotView/ProfileView (null = rien d'ouvert)
  const [mobileContent, setMobileContent] = useState<'bots' | 'profil' | null>(null);
  const [showOwnProfile, setShowOwnProfile] = useState(false);

  useEffect(() => {
    const routeState = getAppRouteState(pathname);
    setActiveTab(routeState.tab);
    setSelectedChat(routeState.chatId);
    if (routeState.tab === 'bots') setBotSection(routeState.botSection);
    if (routeState.tab === 'profil') setProfileSection(routeState.profileSection);
  }, [pathname]);

  useEffect(() => {
    if (!user) return;
    const currentPath = window.location.pathname;
    const hasAuthQuery = new URLSearchParams(window.location.search).has('auth');
    if (currentPath === '/' || currentPath === '/connexion' || hasAuthQuery || (currentPath === '/discussions' && !getAppRouteState(currentPath).chatId)) {
      window.history.replaceState({ appTab: 'discussion' }, '', TAB_PATHS.discussion);
    }
  }, [user]);

  const navigateToPath = (nextPath: string, state: Record<string, string> = {}) => {
    if (window.location.pathname !== nextPath) {
      window.history.pushState({ ...state, appPage: nextPath }, '', nextPath);
    }
  };

  const navigateToTab = (tabId: string) => {
    navigateToPath(TAB_PATHS[tabId] || TAB_PATHS.discussion, { appTab: tabId });
  };

  const navigateToBotSection = (section: BotSection) => {
    setBotSection(section);
    navigateToPath(BOT_SECTION_PATHS[section], { appTab: 'bots', botSection: section });
  };

  const navigateToProfileSection = (section: ProfileSection) => {
    setProfileSection(section);
    navigateToPath(PROFILE_SECTION_PATHS[section], { appTab: 'profil', profileSection: section });
  };

  const navigateToDiscussion = (chatId: string) => {
    const type = chatId.startsWith('private_')
      ? 'privee'
      : chatId.startsWith('botchat_') || chatId.startsWith('ai-')
        ? 'bot'
        : 'groupe';
    navigateToPath(`/discussions/${type}/${encodeURIComponent(chatId)}`, { appTab: 'discussion', chatId });
  };

  const handleViewMyProfile = () => setShowOwnProfile(true);
  useEffect(() => {
    window.addEventListener('view_my_profile', handleViewMyProfile);
    return () => window.removeEventListener('view_my_profile', handleViewMyProfile);
  }, []);

  // ─── Gestion du bouton retour physique (Android / geste iOS) ─────────────────
  // On maintient une "pile" d'états dans l'historique du navigateur.
  // Chaque fois qu'une page s'ouvre, on pushState. popstate = fermer la page du dessus.
  const prevSelectedChat = useRef<string | null>(null);
  const prevMobileContent = useRef<'bots' | 'profil' | null>(null);

  // Pousse un état quand on entre dans une "page" mobile
  useEffect(() => {
    const chatOpened = selectedChat && selectedChat !== prevSelectedChat.current;
    const contentOpened = mobileContent && mobileContent !== prevMobileContent.current;
    if (chatOpened || contentOpened) {
      window.history.pushState({ appPage: selectedChat || mobileContent }, '');
    }
    prevSelectedChat.current = selectedChat;
    prevMobileContent.current = mobileContent;
  }, [selectedChat, mobileContent]);

  // Intercepte le retour physique
  useEffect(() => {
    const handlePopState = () => {
      // Priorité : d'abord fermer les panneaux internes (membres, contact, profil)
      // On dispatch un event custom pour que Chat.tsx puisse fermer ses panneaux
      const evt = new CustomEvent('app_back');
      const handled = window.dispatchEvent(evt);
      // Si personne n'a intercepté (pas de panneau ouvert dans Chat), on ferme la page courante
      if (!window._appBackHandled) {
        if (selectedChat) {
          setSelectedChat(null);
          setSelectedChatData(null);
        } else if (mobileContent) {
          setMobileContent(null);
        } else {
          const routeState = getAppRouteState(window.location.pathname);
          setActiveTab(routeState.tab);
          if (routeState.tab === 'bots') setBotSection(routeState.botSection);
          if (routeState.tab === 'profil') setProfileSection(routeState.profileSection);
        }
      }
      window._appBackHandled = false;
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat, mobileContent]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [nickname, setNickname] = useState('');
  const [authError, setAuthError] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(initialPublicAuthMode !== null);
  const [isRegistering, setIsRegistering] = useState(initialPublicAuthMode === 'inscription');

  const updatePublicAuthUrl = (mode: PublicAuthMode | null, replace = false) => {
    const basePath = window.location.pathname === '/connexion' ? '/' : window.location.pathname;
    const nextUrl = mode ? `${basePath}?auth=${mode}` : basePath;
    const historyMethod = replace ? 'replaceState' : 'pushState';
    window.history[historyMethod]({ auth: mode }, '', nextUrl);
  };

  const openAuthModal = (mode: PublicAuthMode) => {
    setIsRegistering(mode === 'inscription');
    setShowAuthModal(true);
    updatePublicAuthUrl(mode);
  };

  const closeAuthModal = () => {
    setShowAuthModal(false);
    updatePublicAuthUrl(null, true);
  };

  useEffect(() => {
    const handlePublicAuthHistory = () => {
      const mode = getPublicAuthMode(window.location.pathname, window.location.search);
      setIsRegistering(mode === 'inscription');
      setShowAuthModal(mode !== null);
    };
    window.addEventListener('popstate', handlePublicAuthHistory);
    return () => window.removeEventListener('popstate', handlePublicAuthHistory);
  }, []);

  useEffect(() => {
    if (loading || publicConsoleMessageLoggedRef.current) return;
    console.log(PUBLIC_CONSOLE_MESSAGE);
    publicConsoleMessageLoggedRef.current = true;
  }, [loading, user]);

  const handleStartPrivateChat = async (otherUser: any) => {
    if (!user) return;
    const uid1 = user.uid;
    const uid2 = otherUser.id || otherUser.uid;
    if (uid1 === uid2) return;
    
    let finalPhotoURL = otherUser.photoURL || '';
    let finalName = otherUser.displayName || otherUser.nickname || 'Anonyme';
    const chatId = `private_${[uid1, uid2].sort().join('_')}`;

    localStorage.setItem(`last_open_${chatId}`, Date.now().toString());
    setSelectedChat(chatId);
    setSelectedChatData({
      name: finalName,
      avatar: finalPhotoURL
    });

    if (!finalPhotoURL) {
      try {
        const userDoc = await getDoc(doc(db, 'users', uid2));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.photoURL) finalPhotoURL = data.photoURL;
          if (data.displayName || data.nickname) finalName = data.displayName || data.nickname;
          
          setSelectedChatData({
            name: finalName,
            avatar: finalPhotoURL
          });
        }
      } catch (err) {
        console.error("Erreur lors de la récupération du profil:", err);
      }
    }
    
    try {
      const chatRef = doc(db, 'private_chats', chatId);
      await setDoc(chatRef, {
        participants: [uid1, uid2],
        updatedAt: serverTimestamp(),
      }, { merge: true });
      
      await updateDoc(chatRef, {
        deletedBy: arrayRemove(user.uid)
      }).catch(() => {});
    } catch (e) {
      console.error("Erreur lors de la création de la conversation:", e);
    }
  };

  // ─── Titre de l'onglet dynamique ─────────────────────────────────────────
  useEffect(() => {
    const APP = 'Mookup';

    if (!user) {
      document.title = showAuthModal
        ? `${isRegistering ? 'Inscription' : 'Connexion'} | ${APP}`
        : APP;
      return;
    }

    // Conversation ouverte
    if (selectedChat && selectedChatData) {
      document.title = `${selectedChatData.name} | ${APP}`;
      return;
    }

    if (selectedChat) {
      const name =
        selectedChat === 'snapchat'
          ? 'Team Mookup'
          : selectedChat.startsWith('ai-')
          ? 'BDD Bot'
          : selectedChat.startsWith('private_')
          ? 'Discussion privée'
          : 'Groupe Général';
      document.title = `${name} | ${APP}`;
      return;
    }

    // Contenu mobile (bots / profil)
    if (mobileContent === 'bots') {
      const labels: Record<string, string> = {
        accueil: 'Accueil',
        applications: 'Applications',
        statistiques: 'Statistiques',
      };
      document.title = `${labels[botSection] ?? 'Bots'} | ${APP}`;
      return;
    }

    if (activeTab === 'bots') {
      const labels: Record<BotSection, string> = {
        accueil: 'Bots',
        applications: 'Applications',
        statistiques: 'Statistiques',
      };
      document.title = `${labels[botSection]} | ${APP}`;
      return;
    }

    if (activeTab === 'profil') {
      const labels: Record<ProfileSection, string> = {
        infos: 'Infos du compte',
        securite: 'Sécurité',
        statut: 'Statut',
        familial: 'Centre familial',
        'donnees-confidentialite': 'Données et confidentialité',
        'permissions-messagerie': 'Permissions de messagerie',
        notifications: 'Notifications',
        'voix-video': 'Voix et Vidéo',
        apparence: 'Apparence',
        accessibilite: 'Accessibilité',
        systeme: 'Système',
        'langue-heure': 'Langue et heure',
        'confidentialite-activites': 'Confidentialité des activités',
        'applications-connectees': 'Applications connectées',
        developpeur: 'Développeur',
        bio: 'Bio et passions',
        visibilite: 'Visibilité',
        connexions: 'Connexions',
        'conditions-utilisation': 'Conditions d’utilisation',
        confidentialite: 'Confidentialité',
        cookies: 'Cookies',
        administration: 'Administration',
      };
      document.title = `${labels[profileSection]} | ${APP}`;
      return;
    }

    // Onglet actif
    const tabLabels: Record<string, string> = {
      discussion: 'Accueil',
      commu: 'Recherche',
      actus: 'Statut',
      appels: 'Appels',
    };
    document.title = `${tabLabels[activeTab] ?? activeTab} | ${APP}`;
  }, [user, selectedChat, selectedChatData, activeTab, mobileContent, botSection, profileSection, showAuthModal, isRegistering]);


  useEffect(() => {
    if (!user) return;

    const handleSWMessage = async (event: MessageEvent) => {
      if (event.data && event.data.type === 'REPLY_NOTIFICATION') {
        const { text, groupId } = event.data;
        if (text && text.trim() && groupId) {
          try {
            await addDoc(collection(db, 'messages'), {
              text: text,
              uid: user.uid,
              displayName: user.displayName || 'Utilisateur',
              groupId: groupId,
              createdAt: serverTimestamp(),
              readBy: { [user.uid]: user.displayName || 'Utilisateur' }
            });
            console.log(`[GLOBAL REPLY] Message envoyé au groupe ${groupId}`);
          } catch (err) {
            console.error("[GLOBAL REPLY] Erreur envoi réponse notification:", err);
          }
        }
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
      return () => navigator.serviceWorker.removeEventListener('message', handleSWMessage);
    }
  }, [user]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (nickname) {
          await updateProfile(userCredential.user, { displayName: nickname });
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            nickname,
            email,
            createdAt: new Date()
          });
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  if (loading) return null;

  if (!user) {
    return (
      <div className="public-shell" style={{ fontFamily: 'var(--font-dm-sans), "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', backgroundColor: '#f2f3f4', color: '#2c2e33', margin: 0 }}>
        {/* ===== MODAL AUTH ===== */}
        {showAuthModal && (
          <div
            className="public-auth-backdrop"
            onClick={(e) => { if (e.target === e.currentTarget) closeAuthModal(); }}
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          >
            <div className="public-auth-card" style={{ background: '#fff', borderRadius: 16, padding: '32px 28px', width: '100%', maxWidth: 400, boxShadow: '0 24px 60px rgba(0,0,0,0.25)', position: 'relative' }}>
              <button onClick={closeAuthModal} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888', lineHeight: 1 }}>×</button>
              <h2 style={{ margin: '0 0 6px', fontSize: '1.5em', fontWeight: 300, color: '#111', letterSpacing: '-0.01em', fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif' }}>
                {isRegistering ? 'Créer un compte' : 'Se connecter'}
              </h2>
              <p style={{ margin: '0 0 24px', color: '#888', fontSize: '0.93em', fontWeight: 300 }}>
                {isRegistering ? 'Rejoignez Mookup dès maintenant' : 'Bon retour sur Mookup'}
              </p>
              <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {isRegistering && (
                  <div style={{ position: 'relative' }}>
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                    <input type="text" placeholder="Votre prénom" value={nickname} onChange={(e) => setNickname(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-[#f7f7f9] rounded-xl focus:bg-white focus:ring-2 focus:ring-[#5046e5]/30 outline-none text-[15px] transition-all placeholder-gray-400" required />
                  </div>
                )}
                <div style={{ position: 'relative' }}>
                  <Envelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                  <input type="email" placeholder="Adresse e-mail" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-[#f7f7f9] rounded-xl focus:bg-white focus:ring-2 focus:ring-[#5046e5]/30 outline-none text-[15px] transition-all placeholder-gray-400" required />
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                  <input type={showPassword ? 'text' : 'password'} placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 bg-[#f7f7f9] rounded-xl focus:bg-white focus:ring-2 focus:ring-[#5046e5]/30 outline-none text-[15px] transition-all placeholder-gray-400" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#5046e5] transition-colors p-1 z-10 cursor-pointer">
                    {showPassword ? <EyeSlash className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {authError && <p className="public-auth-error" style={{ margin: 0, fontSize: '0.83em', color: '#e53e3e', background: '#fff5f5', padding: '10px 14px', borderRadius: 8, textAlign: 'center' }}>{authError}</p>}
                <button type="submit"
                  style={{ background: '#5046e5', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontWeight: 600, fontSize: '1em', cursor: 'pointer', marginTop: 4 }}>
                  {isRegistering ? 'Créer un compte' : 'Se connecter'}
                </button>
              </form>
              <div className="public-auth-mode-toggle" style={{ marginTop: 20, display: 'flex', background: '#f2f3f4', borderRadius: 10, padding: 4, gap: 4 }}>
                <button type="button" onClick={() => openAuthModal('connexion')}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', fontWeight: 500, fontSize: '0.9em', cursor: 'pointer', background: !isRegistering ? '#5046e5' : 'transparent', color: !isRegistering ? '#fff' : '#666', transition: 'all 0.15s' }}>
                  Connexion
                </button>
                <button type="button" onClick={() => openAuthModal('inscription')}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', fontWeight: 500, fontSize: '0.9em', cursor: 'pointer', background: isRegistering ? '#5046e5' : 'transparent', color: isRegistering ? '#fff' : '#666', transition: 'all 0.15s' }}>
                  Inscription
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== HERO HEADER ===== */}
        <div className="public-hero" style={{ backgroundColor: '#5046e5', position: 'relative', overflow: 'hidden', minHeight: '100vh', boxSizing: 'border-box' }}>
          {/* Shapes décoratives */}
          {([
            { type: 'circle', style: { width: 22, height: 22, top: '12%', left: '7%' } },
            { type: 'square', style: { width: 24, height: 24, top: '9%', right: '9%', transform: 'rotate(15deg)' } },
            { type: 'circle', style: { width: 14, height: 14, top: '30%', right: '16%' } },
            { type: 'square', style: { width: 12, height: 12, top: '58%', left: '16%' } },
            { type: 'circle', style: { width: 18, height: 18, bottom: '6%', left: '3%' } },
            { type: 'square', style: { width: 16, height: 16, bottom: '8%', right: '15%', transform: 'rotate(-12deg)' } },
          ] as { type: string; style: React.CSSProperties }[]).map((sh, i) => (
            <span key={i} style={{ position: 'absolute', opacity: 0.45, background: '#fff', borderRadius: sh.type === 'circle' ? '50%' : 6, ...sh.style }} />
          ))}
          {/* NAV */}
          <nav style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '20px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flexShrink: 0 }}>
              <img src="/Logo.png" alt="Mookup" width={32} height={32} style={{ display: 'block', width: 32, height: 32, flexShrink: 0 }} />
              <span style={{ color: '#fff', fontWeight: 400, fontSize: '1.1em', letterSpacing: '0.06em', fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif', whiteSpace: 'nowrap' }}>Mookup</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              {/* Connexion caché sur mobile, visible à partir de sm */}
              <button type="button" onClick={() => openAuthModal('connexion')}
                className="hidden sm:block"
                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.35)', borderRadius: 8, padding: '9px 18px', fontWeight: 500, fontSize: '0.9em', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Connexion
              </button>
              <button type="button" onClick={() => openAuthModal('inscription')}
                style={{ background: '#fff', color: '#5046e5', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 600, fontSize: '0.9em', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                S&apos;inscrire
              </button>
            </div>
          </nav>

          {/* Hero inner */}
          <div style={{ position: 'relative', zIndex: 1, width: '100%', minHeight: 'calc(100vh - 72px)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h1 style={{ margin: '6vh 24px 0', maxWidth: 780, textAlign: 'center', color: '#fff', fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif', fontWeight: 300, fontSize: 'clamp(2em, 4.5vw, 3.2em)', lineHeight: 1.25, letterSpacing: '-0.01em' }}>
              Votre espace cozy
            </h1>
            <p style={{ margin: '14px 24px 0', maxWidth: 560, textAlign: 'center', color: '#c7c6fb', fontWeight: 300, fontSize: '1.05em', lineHeight: 1.6, letterSpacing: '0.01em' }}>
              Découvrez une nouvelle manière d&apos;interagir avec vos communautés : des threads nouvelle génération, pensés pour des échanges plus vivants.
            </p>
            <div style={{ margin: '34px 24px 0', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14 }}>
              <button type="button" onClick={() => openAuthModal('inscription')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#fff', color: '#5046e5', fontWeight: 600, fontSize: '1.05em', padding: '14px 26px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
                Commencer gratuitement
              </button>
            </div>

            {/* Illustration */}
            <div style={{ position: 'relative', marginTop: 'auto', width: 'min(1050px, 96vw)' }}>
              <div style={{ overflow: 'hidden', aspectRatio: '1000 / 474' }}>
                <img src="/app-skeleton.svg" alt="" style={{ display: 'block', width: '100%', height: 'auto', marginTop: '-10%' }} />
              </div>
              {/* App mobile */}
              <img src="/app-skeleton-mobile.svg" alt="" style={{ position: 'absolute', right: '-4%', bottom: '-12%', width: 'min(220px, 18vw)', zIndex: 2 }} />
              {/* Trèfle */}
              <svg style={{ position: 'absolute', right: '6%', bottom: '50%', transform: 'translateY(115px)', width: 'min(140px, 11vw)', aspectRatio: '1/1', zIndex: 1, pointerEvents: 'none' }}
                viewBox="0 0 400 400" role="img" aria-hidden="true">
                <defs>
                  <g id="mookup-leaf">
                    <path d="M 0 0 C -25 -35, -55 -30, -55 5 C -55 35, -20 48, 0 65 C 20 48, 55 35, 55 5 C 55 -30, 25 -35, 0 0 Z" fill="#42cf00" stroke="#1d5c00" strokeWidth="5" strokeLinejoin="round" />
                    <path d="M 0 15 Q -2 35 0 55" fill="none" stroke="#1d5c00" strokeWidth="4" strokeLinecap="round" />
                  </g>
                </defs>
                <g style={{ cursor: 'pointer' }}>
                  <path d="M 194 205 Q 175 295 240 345 Q 246 348 251 340 Q 193 290 206 205 Z" fill="#42cf00" stroke="#1d5c00" strokeWidth="5" strokeLinejoin="round" />
                  <use href="#mookup-leaf" transform="translate(200, 145) rotate(0)" />
                  <use href="#mookup-leaf" transform="translate(255, 200) rotate(90)" />
                  <use href="#mookup-leaf" transform="translate(200, 255) rotate(180)" />
                  <use href="#mookup-leaf" transform="translate(145, 200) rotate(270)" />
                  <circle cx="200" cy="200" r="14" fill="#42cf00" stroke="#1d5c00" strokeWidth="3" />
                </g>
              </svg>
            </div>
          </div>
        </div>
        {/* ===== FIN HERO ===== */}

        {/* ===== SECTION 1 – Post card ===== */}
        <section className="public-section" style={{ backgroundColor: '#ffffff' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '140px 32px', display: 'flex', alignItems: 'center', gap: 110, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 420px', minWidth: 0, display: 'flex', justifyContent: 'center' }}>
              <img src="/post_card.svg" alt="Aperçu d'un fil de posts sur Mookup" style={{ width: '100%', maxWidth: 420, height: 'auto', display: 'block' }} />
            </div>
            <div style={{ flex: '1 1 420px', minWidth: 0 }}>
              <h2 style={{ fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif', fontWeight: 300, fontSize: 'clamp(2.2em, 4vw, 3.2em)', lineHeight: 1.2, margin: '0 0 20px', color: '#111214', letterSpacing: '-0.02em' }}>
                Des échanges<br />qui prennent<br />leur temps
              </h2>
              <p style={{ fontSize: '1.05em', lineHeight: 1.7, color: '#444', margin: 0, fontWeight: 300 }}>
                Oubliez le flux de messages qui défile sans fin et se perd aussitôt. Chaque post est un espace de discussion indépendant, plus facile à retrouver, plus facile à faire vivre dans la durée.
              </p>
            </div>
          </div>
        </section>

        {/* ===== SECTION 2 – Profile privacy ===== */}
        <section className="public-section-muted" style={{ backgroundColor: '#f0f1f3', position: 'relative' }}>
          <svg style={{ position: 'absolute', top: -69, left: 0, width: '100%', height: 70, display: 'block' }} viewBox="0 0 1200 70" preserveAspectRatio="none">
            <path d="M0 40 C 150 10, 300 60, 450 45 C 650 25, 750 5, 950 30 C 1050 42, 1150 50, 1200 35 L1200 70 L0 70 Z" fill="#f0f1f3" />
          </svg>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '140px 32px', display: 'flex', alignItems: 'center', gap: 110, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
            <div style={{ flex: '1 1 420px', minWidth: 0, order: 1 }}>
              <h2 style={{ fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif', fontWeight: 300, fontSize: 'clamp(2.2em, 4vw, 3.2em)', lineHeight: 1.2, margin: '0 0 20px', color: '#111214', letterSpacing: '-0.02em' }}>
                Votre espace,<br />vos règles
              </h2>
              <p style={{ fontSize: '1.05em', lineHeight: 1.7, color: '#444', margin: 0, fontWeight: 300 }}>
                Définissez vos propres règles de confidentialité et contrôlez qui peut voir vos publications et interagir avec elles.
              </p>
            </div>
            <div style={{ flex: '1 1 420px', minWidth: 0, display: 'flex', justifyContent: 'center', order: 2 }}>
              <img src="/profile-privacy.svg" alt="Profil Mookup et confidentialité" style={{ width: '100%', maxWidth: 420, height: 'auto', display: 'block' }} />
            </div>
          </div>
        </section>

        {/* ===== SECTION 3 – Personnalisation ===== */}
        <section className="public-section" style={{ backgroundColor: '#ffffff', position: 'relative' }}>
          <svg style={{ position: 'absolute', top: -69, left: 0, width: '100%', height: 70, display: 'block' }} viewBox="0 0 1200 70" preserveAspectRatio="none">
            <path d="M0 40 C 150 10, 300 60, 450 45 C 650 25, 750 5, 950 30 C 1050 42, 1150 50, 1200 35 L1200 70 L0 70 Z" fill="#ffffff" />
          </svg>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '180px 32px', display: 'flex', alignItems: 'center', gap: 140, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 420px', minWidth: 0, display: 'flex', justifyContent: 'center' }}>
              <img src="/personnalisation.svg" alt="Communauté personnalisée sur Mookup" style={{ width: '100%', maxWidth: 420, height: 'auto', display: 'block' }} />
            </div>
            <div style={{ flex: '1 1 420px', minWidth: 0 }}>
              <h2 style={{ fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif', fontWeight: 300, fontSize: 'clamp(2.2em, 4vw, 3.2em)', lineHeight: 1.2, margin: '0 0 20px', color: '#111214', letterSpacing: '-0.02em' }}>
                Communautés<br />à votre image
              </h2>
              <p style={{ fontSize: '1.05em', lineHeight: 1.7, color: '#444', margin: 0, fontWeight: 300 }}>
                Créez une communauté sur le thème de votre choix, personnalisez sa bannière et son icône, et lancez-la en quelques clics.
              </p>
            </div>
          </div>
        </section>

        {/* ===== CTA FINAL ===== */}
        <section className="public-section-muted" style={{ backgroundColor: '#f0f1f3', position: 'relative', padding: '140px 32px', textAlign: 'center' }}>
          <svg style={{ position: 'absolute', top: -69, left: 0, width: '100%', height: 70, display: 'block' }} viewBox="0 0 1200 70" preserveAspectRatio="none">
            <path d="M0 40 C 150 10, 300 60, 450 45 C 650 25, 750 5, 950 30 C 1050 42, 1150 50, 1200 35 L1200 70 L0 70 Z" fill="#f0f1f3" />
          </svg>
          {([
            { type: 'square', style: { width: 26, height: 26, top: '10%', left: '8%', background: '#fbcfe8', transform: 'rotate(10deg)' } },
            { type: 'square', style: { width: 22, height: 22, top: '14%', right: '22%', background: '#99f6e4', transform: 'rotate(-14deg)' } },
            { type: 'square', style: { width: 20, height: 20, top: '62%', left: '12%', background: '#fed7aa', transform: 'rotate(18deg)' } },
            { type: 'square', style: { width: 18, height: 18, top: '60%', right: '18%', background: '#fde68a', transform: 'rotate(-8deg)' } },
            { type: 'square', style: { width: 20, height: 20, top: '42%', right: '5%', background: '#ddd6fe', transform: 'rotate(-6deg)' } },
          ] as { type: string; style: React.CSSProperties }[]).map((sh, i) => (
            <span key={i} style={{ position: 'absolute', opacity: 0.85, borderRadius: 8, ...sh.style }} />
          ))}
          <div style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '0 auto' }}>
            <h2 style={{ fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif', fontWeight: 300, fontSize: 'clamp(2.2em, 4vw, 3.2em)', lineHeight: 1.2, margin: 0, color: '#111214', letterSpacing: '-0.02em' }}>
              Prêt à commencer ?
            </h2>
            <button type="button" onClick={() => openAuthModal('inscription')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#5046e5', color: '#fff', fontWeight: 600, fontSize: '1.05em', padding: '14px 28px', borderRadius: 8, border: 'none', cursor: 'pointer', marginTop: 36 }}>
              Créer un compte gratuitement
            </button>
          </div>
        </section>

        {/* ===== FOOTER ===== */}
        <footer style={{ backgroundColor: '#1a1a1a', padding: '24px 32px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', color: '#787c84', fontSize: '0.85em', textAlign: 'center', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 24px' }}>
            <a href="/politique-confidentialite" style={{ color: '#787c84', textDecoration: 'none' }}>Politique de confidentialité</a>
            <a href="/conditions-utilisation" style={{ color: '#787c84', textDecoration: 'none' }}>Conditions d&apos;utilisation</a>
            <a href="/cookies" style={{ color: '#787c84', textDecoration: 'none' }}>Cookies</a>
            <span>© {new Date().getFullYear()} Mookup. Tous droits réservés.</span>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="app-shell h-[100dvh] flex overflow-hidden bg-white">
      <CallHandler user={user} />
      <div className={`${(selectedChat || mobileContent) ? 'hidden md:flex' : 'flex'} w-full md:w-[380px] md:min-w-[380px] border-r border-gray-200 flex-col`}>
        <HomeView 
          user={user}
          activeTab={activeTab}
          onSelectGroup={(id, data) => {
            setSelectedChat(id);
            setSelectedChatData(data || null);
            setMobileContent(null);
            if (id) {
              setActiveTab('discussion');
              navigateToDiscussion(id);
            }
          }} 
          selectedGroupId={selectedChat}
          onTabChange={(tabId) => {
            setActiveTab(tabId);
            if (tabId === 'bots') setBotSection('accueil');
            if (tabId === 'profil') setProfileSection('infos');
            navigateToTab(tabId);
            setShowOwnProfile(false);
            if (tabId !== 'discussion') {
              setSelectedChat(null);
              setSelectedChatData(null);
            }
            setMobileContent(null);
          }}
          botSection={botSection}
          onBotSectionChange={navigateToBotSection}
          onProfileSectionChange={navigateToProfileSection}
          onMobileOpenContent={(tab) => setMobileContent(tab)}
        />
      </div>

      {/* Colonne droite : visible sur desktop toujours, sur mobile seulement si selectedChat ou mobileContent */}
      <div className={`${(selectedChat || mobileContent) ? 'flex' : 'hidden md:flex'} flex-1 min-w-0 flex-col relative bg-[#efeae2]`}>
        {selectedChat ? (
          <Chat 
            groupId={selectedChat}
            groupName={
              selectedChatData?.name || (
                selectedChat === 'snapchat' 
                  ? 'Team Mookup'                  : selectedChat?.startsWith('ai-')
                    ? 'BDD Bot'
                    : selectedChat?.startsWith('botchat_')
                      ? 'Bot'
                      : 'Groupe Général'
              )
            }
            groupAvatar={selectedChatData?.avatar}
            onBack={() => {
              setSelectedChat(null);
              setSelectedChatData(null);
              navigateToTab('discussion');
            }}
            onStartPrivateChat={handleStartPrivateChat}
            onOpenBotChat={(chatId, data) => {
              setSelectedChat(chatId);
              setSelectedChatData(data);
              setActiveTab('discussion');
              setMobileContent(null);
              navigateToDiscussion(chatId);
            }}
            onNavigate={(tabId) => {
              const evt = new CustomEvent('app_navigate', { detail: { tabId } });
              window.dispatchEvent(evt);
            }}
          />
        ) : (mobileContent === 'bots' || activeTab === 'bots') ? (
          <div className="flex flex-1 min-w-0 flex-col bg-white h-full">
            {/* Bouton retour sur mobile */}
            <div className="md:hidden flex items-center gap-2 px-4 h-[60px] border-b border-gray-200 flex-shrink-0 bg-white">
              <button
                onClick={() => setMobileContent(null)}
                className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-all"
              >
                <CaretLeft size={22} />
              </button>
              <span className="text-[16px] font-normal text-gray-800">Bots</span>
            </div>
            <div className="flex-1 min-h-0 relative h-full">
              <BotPage
                section={botSection}
                onSectionChange={setBotSection}
                onOpenBotChat={(chatId, data) => {
                  setSelectedChat(chatId);
                  setSelectedChatData(data);
                  setActiveTab('discussion');
                  setMobileContent(null);
                  window.dispatchEvent(new CustomEvent('app_navigate', { detail: { tabId: 'discussion' } }));
                }}
              />
            </div>
          </div>
        ) : (mobileContent === 'profil' || activeTab === 'profil') ? (
          <div className="flex flex-1 min-w-0 flex-col relative bg-white h-full overflow-hidden">
            {showOwnProfile ? (
              <MyProfilePresentation onClose={() => setShowOwnProfile(false)} />
            ) : (
              <>
                {/* Bouton retour sur mobile */}
                <div className="md:hidden flex items-center gap-2 px-4 h-[60px] border-b border-gray-200 flex-shrink-0 bg-white">
                  <button
                    onClick={() => setMobileContent(null)}
                    className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                  >
                    <CaretLeft size={22} />
                  </button>
                  <span className="text-[16px] font-normal text-gray-800">Profil</span>
                </div>
                <div className="flex-1 min-h-0 relative h-full overflow-y-auto">
                  <ProfilePage section={profileSection} />
                </div>
              </>
            )}
          </div>
        ) : (
          <WelcomePanel />
        )}
      </div>
    </div>
  );
}
