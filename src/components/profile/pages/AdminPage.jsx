'use client';

import { useEffect, useState } from 'react';
import { ArrowClockwise, ArrowLeft, ChartLineUp, CheckCircle, CircleNotch, Gear, Key, LockKey, MagnifyingGlass, PaperPlaneRight, ShieldCheck, SignOut, UsersThree, WarningCircle } from '@phosphor-icons/react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { adminAuth, adminDb } from '@/lib/firebase';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { isAdminEmail } from '@/lib/adminConfig';
import UserAvatar from '@/components/ui/UserAvatar';

function getAuthErrorMessage(error) {
  switch (error?.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Adresse email ou mot de passe incorrect.';
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Réessaie dans quelques instants.';
    default:
      return 'Impossible de se connecter pour le moment.';
  }
}

export default function AdminPage() {
  const [showLogin, setShowLogin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [broadcastText, setBroadcastText] = useState('');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [broadcastFeedback, setBroadcastFeedback] = useState({ type: '', text: '' });

  useEffect(() => {
    const currentUser = adminAuth.currentUser;
    if (currentUser && isAdminEmail(currentUser.email)) {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;

    const loadUsers = async () => {
      const currentUser = adminAuth.currentUser;
      if (!currentUser) return;
      setUsersLoading(true);
      setUsersError('');
      try {
        const snapshot = await getDocs(collection(adminDb, 'users'));
        const listedUsers = snapshot.docs.map(userDocument => {
          const data = userDocument.data();
          return {
            uid: data.uid || userDocument.id,
            email: data.email || '',
            displayName: data.displayName || data.nickname || 'Utilisateur',
            photoURL: data.photoURL || '',
            emailVerified: data.emailVerified === true,
            disabled: data.disabled === true,
          };
        }).sort((first, second) => first.displayName.localeCompare(second.displayName, 'fr'));
        if (!cancelled) setUsers(listedUsers);
      } catch (loadError) {
        if (!cancelled) setUsersError(loadError.message || 'Impossible de charger les utilisateurs.');
      } finally {
        if (!cancelled) setUsersLoading(false);
      }
    };

    void loadUsers();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const handleLogin = async (event) => {
    event.preventDefault();
    if (!email.trim() || !password) return;

    setError('');
    setIsLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(adminAuth, email.trim(), password);
      if (!isAdminEmail(credential.user.email)) {
        await signOut(adminAuth);
        setError('Cette adresse email n’est pas autorisée à accéder à l’administration.');
        return;
      }

      setIsAuthenticated(true);
      setPassword('');
    } catch (loginError) {
      console.error('Erreur connexion administration:', loginError);
      setError(loginError?.message || getAuthErrorMessage(loginError));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(adminAuth);
    setIsAuthenticated(false);
    setUsers([]);
    setShowLogin(true);
  };

  const handleBroadcast = async (event) => {
    event.preventDefault();
    const text = broadcastText.trim();
    const currentUser = adminAuth.currentUser;
    if (!text || !currentUser || isSendingBroadcast) return;

    setIsSendingBroadcast(true);
    setBroadcastFeedback({ type: '', text: '' });
    try {
      await addDoc(collection(adminDb, 'messages'), {
        text,
        uid: 'team-mookup',
        displayName: 'Team Mookup',
        photoURL: '/Logo.png',
        groupId: 'snapchat',
        createdAt: serverTimestamp(),
        readBy: { 'team-mookup': 'Team Mookup' },
        isAdminAnnouncement: true,
      });
      setBroadcastText('');
      setBroadcastFeedback({ type: 'success', text: 'Message envoyé dans Team Mookup.' });
    } catch (sendError) {
      setBroadcastFeedback({ type: 'error', text: sendError?.message || 'Impossible d’envoyer le message.' });
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const search = userSearch.trim().toLocaleLowerCase();
    if (!search) return true;
    return `${user.displayName} ${user.email}`.toLocaleLowerCase().includes(search);
  });

  if (isAuthenticated) {
    return (
      <div className="w-full max-w-2xl p-6 pb-12">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-[12px] font-semibold text-indigo-700">
              <ShieldCheck size={16} weight="fill" /> Connexion administrateur active
            </div>
            <h2 className="text-2xl font-semibold text-gray-900">Tableau de bord</h2>
            <p className="mt-1 text-[15px] text-gray-500">Bienvenue dans l’espace d’administration de Mookup.</p>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="inline-flex flex-shrink-0 items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            <SignOut size={17} /> Déconnexion
          </button>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <UsersThree size={22} className="text-indigo-500" />
            <p className="mt-3 text-[14px] font-semibold text-gray-800">Utilisateurs</p>
            <p className="mt-1 text-[12px] text-gray-400">{users.length} compte{users.length > 1 ? 's' : ''} Firebase</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <ChartLineUp size={22} className="text-blue-500" />
            <p className="mt-3 text-[14px] font-semibold text-gray-800">Team Mookup</p>
            <p className="mt-1 text-[12px] text-gray-400">Annonces globales</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <Gear size={22} className="text-gray-400" />
            <p className="mt-3 text-[14px] font-semibold text-gray-800">Accès admin</p>
            <p className="mt-1 text-[12px] text-gray-400">Session sécurisée</p>
          </div>
        </div>

        <section className="mb-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 shadow-sm">
          <div className="mb-3 flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <PaperPlaneRight size={20} weight="fill" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-gray-900">Message à tout le monde</h3>
              <p className="mt-1 text-[12px] leading-5 text-gray-500">Publie une annonce visible par tous les membres dans Team Mookup.</p>
            </div>
          </div>
          <form onSubmit={handleBroadcast}>
            <textarea
              value={broadcastText}
              onChange={(event) => setBroadcastText(event.target.value)}
              maxLength={4000}
              rows={3}
              placeholder="Écrire une annonce pour Team Mookup…"
              className="w-full resize-y rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-[14px] text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-400"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-[11px] text-gray-400">{broadcastText.length}/4000</span>
              <button
                type="submit"
                disabled={!broadcastText.trim() || isSendingBroadcast}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSendingBroadcast ? <CircleNotch size={16} className="animate-spin" /> : <PaperPlaneRight size={16} />}
                {isSendingBroadcast ? 'Envoi…' : 'Envoyer dans Team Mookup'}
              </button>
            </div>
          </form>
          {broadcastFeedback.text && (
            <div className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] ${broadcastFeedback.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {broadcastFeedback.type === 'success' ? <CheckCircle size={16} /> : <WarningCircle size={16} />}
              {broadcastFeedback.text}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-semibold text-gray-900">Utilisateurs inscrits</h3>
              <p className="mt-1 text-[12px] text-gray-500">Profils réels enregistrés dans Firestore.</p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-2 text-[12px] font-medium text-gray-600 transition-colors hover:bg-gray-50"
              title="Actualiser la liste"
            >
              <ArrowClockwise size={15} /> Actualiser
            </button>
          </div>
          <label className="relative block">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="Rechercher un nom ou un email"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-[13px] outline-none transition-colors focus:border-blue-400 focus:bg-white"
            />
          </label>

          {usersLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-gray-500"><CircleNotch size={19} className="animate-spin" /> Chargement des utilisateurs…</div>
          ) : usersError ? (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-3 text-[13px] text-red-600"><WarningCircle size={17} /> {usersError}</div>
          ) : filteredUsers.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-gray-400">Aucun utilisateur trouvé.</p>
          ) : (
            <div className="mt-3 divide-y divide-gray-100">
              {filteredUsers.map((listedUser) => (
                <div key={listedUser.uid} className="flex items-center gap-3 py-3">
                  {listedUser.photoURL ? (
                    <img src={listedUser.photoURL} alt="" className="h-10 w-10 flex-shrink-0 rounded-full object-cover" />
                  ) : (
                    <UserAvatar
                      uid={listedUser.uid}
                      photoURL={null}
                      displayName={listedUser.displayName}
                      size={40}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[13px] font-semibold text-gray-800">{listedUser.displayName}</p>
                      {isAdminEmail(listedUser.email) && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">Admin</span>}
                      {listedUser.disabled && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">Désactivé</span>}
                    </div>
                    <p className="truncate text-[12px] text-gray-500">{listedUser.email || 'Email non renseigné'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl p-6 pb-12">
      <div className="relative min-h-[430px] overflow-hidden">
        {/* Présentation de l’espace admin */}
        <div className={`absolute inset-0 flex flex-col items-center justify-center text-center transition-all duration-300 ease-out ${showLogin ? '-translate-x-8 opacity-0' : 'translate-x-0 opacity-100'}`}>
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600 shadow-sm">
            <ShieldCheck size={44} weight="fill" />
          </div>
          <h2 className="mt-6 text-2xl font-semibold text-gray-900">Administration</h2>
          <p className="mt-2 max-w-md text-[15px] leading-6 text-gray-500">Un espace réservé à l’équipe Mookup pour suivre et administrer le site.</p>
          <button
            type="button"
            onClick={() => { setError(''); setShowLogin(true); }}
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            Accéder à la connexion <Key size={18} />
          </button>
        </div>

        {/* Connexion admin */}
        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out ${showLogin ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-8 opacity-0'}`}>
          <form onSubmit={handleLogin} className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <button
              type="button"
              onClick={() => { setError(''); setShowLogin(false); }}
              className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-800"
            >
              <ArrowLeft size={17} /> Retour
            </button>
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <LockKey size={23} weight="fill" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Connexion admin</h2>
                <p className="text-[13px] text-gray-500">Accès réservé à l’équipe Mookup</p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 ml-1 block text-[11px] font-bold uppercase tracking-widest text-gray-400">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@mookup.fr"
                  autoComplete="username"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-[15px] text-gray-800 outline-none transition-colors focus:border-blue-500 focus:bg-white"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1.5 ml-1 block text-[11px] font-bold uppercase tracking-widest text-gray-400">Mot de passe</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Votre mot de passe"
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-[15px] text-gray-800 outline-none transition-colors focus:border-blue-500 focus:bg-white"
                  required
                />
              </label>
            </div>

            {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-center text-[13px] text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={isLoading}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
            >
              {isLoading ? <CircleNotch size={19} className="animate-spin" /> : <LockKey size={18} />}
              {isLoading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
