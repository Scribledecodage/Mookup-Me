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
import Chat from '@/components/Chat';
import HomeView from '@/components/HomeView';
import CallHandler from '@/components/CallHandler';
import BotPage from '@/components/bots/BotPage';
import ProfilePage from '@/components/profile/ProfilePage';
import MyProfilePresentation from '@/components/profile/MyProfilePresentation';
import { useState, useEffect, useRef } from 'react';
import { Eye, EyeSlash, Lock, Envelope, Laptop, User, UserFocus, UsersThree, CaretLeft } from '@phosphor-icons/react';
import type { BotSection } from '@/components/sidebar/BotView';
import type { ProfileSection } from '@/components/sidebar/ProfileView';

// ─── Salutation animée ──────────────────────────────────────────────────────

function getGreeting(): { text: string; emoji: string } {
  const h = new Date().getHours();
  if (h >= 4 && h < 6)   return { text: 'Lève-tôt aujourd\'hui !',       emoji: '🌅' };
  if (h >= 6 && h < 9)   return { text: 'Bon réveil',                     emoji: '☀️' };
  if (h >= 9 && h < 12)  return { text: 'Belle matinée',                  emoji: '🌤' };
  if (h >= 12 && h < 14) return { text: 'Bon appétit',                    emoji: '🍽️' };
  if (h >= 14 && h < 18) return { text: 'Bonne après-midi',               emoji: '🌿' };
  if (h >= 18 && h < 21) return { text: 'Belle soirée',                   emoji: '🌆' };
  if (h >= 21 && h < 23) return { text: 'Bonne nuit',                     emoji: '🌙' };
  return                         { text: 'Encore debout ?',                emoji: '🦉' };
}

function WelcomePanel() {
  const { text, emoji } = getGreeting();
  const full = text;
  const [displayed, setDisplayed] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const indexRef = useRef(0);

  // ── PWA install ──────────────────────────────────────────────────────────
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler as EventListener);
    window.addEventListener('appinstalled', () => { setInstalled(true); setInstallPrompt(null); });
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener);
  }, []);

  const handleInstall = async () => {
    if (installed) return;
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') setInstalled(true);
      setInstallPrompt(null);
    } else {
      // Pas de prompt natif → modale d'instructions
      setShowInstallModal(true);
    }
  };

  // Détecter le navigateur pour les instructions
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isFirefox = /firefox/i.test(ua);

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
    <div className="hidden md:flex h-full flex-col bg-[#f9f9f9]">
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

          {/* Installer l'application */}
          <div
            className={`flex flex-col items-center gap-3 ${installed ? 'cursor-default' : 'cursor-pointer'} group`}
            onClick={handleInstall}
          >
            <div className={`w-16 h-11 bg-white rounded-full flex items-center justify-center transition-all shadow-sm ${!installed ? 'hover:bg-gray-50' : 'opacity-50'}`}>
              <Laptop size={22} className="text-gray-800" />
            </div>
            <span className="text-[13px] font-medium text-gray-700">
              {installed ? 'Application installée' : 'Installer l\'application'}
            </span>
          </div>

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

    {/* Modale instructions installation */}
    {showInstallModal && (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center md:items-center bg-black/30"
        onClick={() => setShowInstallModal(false)}
      >
        <div
          className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-sm px-6 pt-5 pb-8 shadow-xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="w-8 h-1 bg-gray-200 rounded-full mx-auto mb-5 md:hidden" />
          <p className="text-[15px] font-semibold text-gray-900 mb-1">Installer l&apos;application</p>
          <p className="text-[13px] text-gray-500 mb-5">
            {isIOS && isSafari
              ? 'Sur Safari : appuyez sur le bouton Partager puis "Sur l\'écran d\'accueil".'
              : isFirefox
              ? 'Sur Firefox : ouvrez le menu (⋮) puis "Installer".'
              : 'Sur Chrome ou Edge : ouvrez le menu (⋮) puis "Ajouter à l\'écran d\'accueil" ou "Installer l\'application".'}
          </p>
          <button
            onClick={() => setShowInstallModal(false)}
            className="w-full py-2.5 rounded-xl bg-[#5046e5] text-white text-[13.5px] font-semibold hover:bg-[#4338ca] transition-colors"
          >
            Compris
          </button>
        </div>
      </div>
    )}
    </>
  );
}

export default function Home() {
  const [user, loading] = useAuthState(auth);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [selectedChatData, setSelectedChatData] = useState<{ name: string, avatar?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<string>('discussion');
  const [botSection, setBotSection] = useState<BotSection>('accueil');
  const [profileSection, setProfileSection] = useState<ProfileSection>('infos');
  // Sur mobile : contenu ouvert depuis BotView/ProfileView (null = rien d'ouvert)
  const [mobileContent, setMobileContent] = useState<'bots' | 'profil' | null>(null);
  const [showOwnProfile, setShowOwnProfile] = useState(false);

  useEffect(() => {
    const handleViewMyProfile = () => setShowOwnProfile(true);
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
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);

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
      document.title = APP;
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
        accueil: 'Bots',
        applications: 'Applications',
        serveurs: 'Serveurs',
        debug: 'Debug',
      };
      document.title = `${labels[botSection] ?? 'Bots'} | ${APP}`;
      return;
    }

    if (mobileContent === 'profil') {
      const labels: Record<string, string> = {
        infos: 'Infos du compte',
        securite: 'Sécurité',
        statut: 'Statut du compte',
        familial: 'Centre familial',
      };
      document.title = `${labels[profileSection] ?? 'Profil'} | ${APP}`;
      return;
    }

    // Onglet actif
    const tabLabels: Record<string, string> = {
      discussion: 'Accueil',
      commu: 'Recherche',
      actus: 'Statuts',
      appels: 'Appels',
      bots: 'Bots',
      profil: 'Profil',
    };
    document.title = `${tabLabels[activeTab] ?? activeTab} | ${APP}`;
  }, [user, selectedChat, selectedChatData, activeTab, mobileContent, botSection, profileSection]);


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
      <div style={{ fontFamily: 'var(--font-dm-sans), "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', backgroundColor: '#f2f3f4', color: '#2c2e33', margin: 0 }}>
        {/* ===== MODAL AUTH ===== */}
        {showAuthModal && (
          <div
            onClick={(e) => { if (e.target === e.currentTarget) setShowAuthModal(false); }}
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          >
            <div style={{ background: '#fff', borderRadius: 16, padding: '32px 28px', width: '100%', maxWidth: 400, boxShadow: '0 24px 60px rgba(0,0,0,0.25)', position: 'relative' }}>
              <button onClick={() => setShowAuthModal(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888', lineHeight: 1 }}>×</button>
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
                {authError && <p style={{ margin: 0, fontSize: '0.83em', color: '#e53e3e', background: '#fff5f5', padding: '10px 14px', borderRadius: 8, textAlign: 'center' }}>{authError}</p>}
                <button type="submit"
                  style={{ background: '#5046e5', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontWeight: 600, fontSize: '1em', cursor: 'pointer', marginTop: 4 }}>
                  {isRegistering ? 'Créer un compte' : 'Se connecter'}
                </button>
              </form>
              <div style={{ marginTop: 20, display: 'flex', background: '#f2f3f4', borderRadius: 10, padding: 4, gap: 4 }}>
                <button type="button" onClick={() => setIsRegistering(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', fontWeight: 500, fontSize: '0.9em', cursor: 'pointer', background: !isRegistering ? '#5046e5' : 'transparent', color: !isRegistering ? '#fff' : '#666', transition: 'all 0.15s' }}>
                  Connexion
                </button>
                <button type="button" onClick={() => setIsRegistering(true)}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', fontWeight: 500, fontSize: '0.9em', cursor: 'pointer', background: isRegistering ? '#5046e5' : 'transparent', color: isRegistering ? '#fff' : '#666', transition: 'all 0.15s' }}>
                  Inscription
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== HERO HEADER ===== */}
        <div style={{ backgroundColor: '#5046e5', position: 'relative', overflow: 'hidden', minHeight: '100vh', boxSizing: 'border-box' }}>
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
              <button type="button" onClick={() => { setIsRegistering(false); setShowAuthModal(true); }}
                className="hidden sm:block"
                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.35)', borderRadius: 8, padding: '9px 18px', fontWeight: 500, fontSize: '0.9em', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Connexion
              </button>
              <button type="button" onClick={() => { setIsRegistering(true); setShowAuthModal(true); }}
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
              <button type="button" onClick={() => { setIsRegistering(true); setShowAuthModal(true); }}
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
        <section style={{ backgroundColor: '#ffffff' }}>
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
        <section style={{ backgroundColor: '#f0f1f3', position: 'relative' }}>
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
        <section style={{ backgroundColor: '#ffffff', position: 'relative' }}>
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
        <section style={{ backgroundColor: '#f0f1f3', position: 'relative', padding: '140px 32px', textAlign: 'center' }}>
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
            <button type="button" onClick={() => { setIsRegistering(true); setShowAuthModal(true); }}
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
    <div className="h-[100dvh] flex overflow-hidden bg-white">
      <CallHandler user={user} />
      <div className={`${(selectedChat || mobileContent) ? 'hidden md:flex' : 'flex'} w-full md:w-[380px] md:min-w-[380px] border-r border-gray-200 flex-col`}>
        <HomeView 
          user={user}
          onSelectGroup={(id, data) => {
            setSelectedChat(id);
            setSelectedChatData(data || null);
            setMobileContent(null);
          }} 
          selectedGroupId={selectedChat}
          onTabChange={(tabId) => {
            setActiveTab(tabId);
            setShowOwnProfile(false);
            if (tabId !== 'discussion') {
              setSelectedChat(null);
              setSelectedChatData(null);
            }
            setMobileContent(null);
          }}
          onBotSectionChange={setBotSection}
          onProfileSectionChange={setProfileSection}
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
                  ? 'Team Mookup' 
                  : selectedChat?.startsWith('ai-') 
                    ? 'BDD Bot' 
                    : 'Groupe Général'
              )
            }
            groupAvatar={selectedChatData?.avatar}
            onBack={() => {
              setSelectedChat(null);
              setSelectedChatData(null);
            }}
            onStartPrivateChat={handleStartPrivateChat}
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
              <BotPage section={botSection} />
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
