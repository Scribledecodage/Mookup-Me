'use client';

import { useState } from 'react';
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { CheckCircle, CircleNotch, DownloadSimple, Trash, Warning } from '@phosphor-icons/react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';

const inputCls = 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-[15px] transition-colors';
const labelCls = 'text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1 block mb-1';

function normalize(value) {
  if (value?.toDate instanceof Function) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)]));
  return value;
}

async function deleteRefs(refs) {
  for (let index = 0; index < refs.length; index += 450) {
    const batch = writeBatch(db);
    refs.slice(index, index + 450).forEach((reference) => batch.delete(reference));
    await batch.commit();
  }
}

export default function DataPrivacyPage() {
  const [user] = useAuthState(auth);
  const [accountPassword, setAccountPassword] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadUserData = async () => {
    if (!user) throw new Error('Utilisateur non connecté.');
    const [profile, messages, groups, privateChats, calls, sessions, statuses, presence] = await Promise.all([
      getDoc(doc(db, 'users', user.uid)),
      getDocs(query(collection(db, 'messages'), where('uid', '==', user.uid))),
      getDocs(query(collection(db, 'groups'), where('members', 'array-contains', user.uid))),
      getDocs(query(collection(db, 'private_chats'), where('participants', 'array-contains', user.uid))),
      getDocs(query(collection(db, 'calls'), where('participants', 'array-contains', user.uid))),
      getDocs(collection(db, 'users', user.uid, 'sessions')),
      getDoc(doc(db, 'statuses', user.uid)),
      getDoc(doc(db, 'status', user.uid)),
    ]);

    const mapDocs = (snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    return normalize({
      exportedAt: new Date(),
      account: { uid: user.uid, email: user.email || null, displayName: user.displayName || null },
      profile: profile.exists() ? profile.data() : null,
      messages: mapDocs(messages),
      groups: mapDocs(groups),
      privateChats: mapDocs(privateChats),
      calls: mapDocs(calls),
      sessions: mapDocs(sessions),
      statuses: statuses.exists() ? statuses.data() : null,
      presence: presence.exists() ? presence.data() : null,
    });
  };

  const downloadData = async () => {
    setError('');
    setMessage('');
    setIsDownloading(true);
    try {
      const data = await loadUserData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mookup-donnees-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage('Vos données ont été téléchargées.');
    } catch (downloadError) {
      console.error('Erreur export données:', downloadError);
      setError('Impossible de télécharger vos données.');
    } finally {
      setIsDownloading(false);
    }
  };

  const deletePersonalData = async () => {
    if (!user) throw new Error('Utilisateur non connecté.');
    const [messages, calls, sessions] = await Promise.all([
      getDocs(query(collection(db, 'messages'), where('uid', '==', user.uid))),
      getDocs(query(collection(db, 'calls'), where('initiatorId', '==', user.uid))),
      getDocs(collection(db, 'users', user.uid, 'sessions')),
    ]);
    const refs = [
      doc(db, 'users', user.uid),
      doc(db, 'statuses', user.uid),
      doc(db, 'status', user.uid),
      ...messages.docs.map((item) => item.ref),
      ...calls.docs.map((item) => item.ref),
      ...sessions.docs.map((item) => item.ref),
    ];
    await deleteRefs(refs);
  };

  const handleDeleteData = async () => {
    if (!user || !window.confirm('Supprimer votre profil, vos messages et vos statuts ? Cette action est irréversible.')) return;
    setError('');
    setMessage('');
    setIsDeleting(true);
    try {
      await deletePersonalData();
      setMessage('Vos données personnelles ont été supprimées.');
    } catch (deleteError) {
      console.error('Erreur suppression données:', deleteError);
      setError('Impossible de supprimer toutes vos données.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || !window.confirm('Supprimer définitivement votre compte ? Cette action est irréversible.')) return;
    setError('');
    setMessage('');
    setIsDeleting(true);
    try {
      if (user.email) {
        if (!accountPassword) {
          setError('Saisissez votre mot de passe pour confirmer.');
          setIsDeleting(false);
          return;
        }
        await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, accountPassword));
      }
      await deletePersonalData();
      await deleteUser(user);
    } catch (deleteError) {
      console.error('Erreur suppression compte:', deleteError);
      if (deleteError?.code === 'auth/wrong-password' || deleteError?.code === 'auth/invalid-credential') {
        setError('Le mot de passe est incorrect.');
      } else if (deleteError?.code === 'auth/requires-recent-login') {
        setError('Reconnectez-vous avant de supprimer votre compte.');
      } else {
        setError('Impossible de supprimer le compte pour le moment.');
      }
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-6 pb-12 w-full max-w-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">Données et confidentialité</h2>
        <p className="text-gray-500 text-[15px]">Gérez les informations enregistrées par Mookup.</p>
      </div>

      <div className="space-y-3">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <DownloadSimple size={24} className="mt-0.5 flex-shrink-0 text-blue-500" />
            <div className="min-w-0 flex-1">
              <h3 className="text-[17px] font-semibold text-gray-900">Télécharger mes données</h3>
              <p className="mt-1 text-[13px] leading-5 text-gray-500">Recevez un fichier avec votre profil, vos messages, vos groupes et vos connexions.</p>
              <button type="button" onClick={downloadData} disabled={isDownloading || !user} className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400">
                {isDownloading ? <CircleNotch size={18} className="animate-spin" /> : <DownloadSimple size={18} />} Télécharger mes données
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-orange-200 bg-orange-50 p-5">
          <div className="flex items-start gap-3">
            <Warning size={24} className="mt-0.5 flex-shrink-0 text-orange-500" />
            <div className="min-w-0 flex-1">
              <h3 className="text-[17px] font-semibold text-gray-900">Supprimer mes données</h3>
              <p className="mt-1 text-[13px] leading-5 text-gray-600">Supprimez votre profil, vos messages et vos statuts. Votre compte restera accessible.</p>
              <button type="button" onClick={handleDeleteData} disabled={isDeleting || !user} className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-orange-300 bg-white px-4 py-2.5 text-[13px] font-semibold text-orange-700 transition-colors hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50">
                {isDeleting ? <CircleNotch size={18} className="animate-spin" /> : <Trash size={18} />} Supprimer mes données
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-red-200 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <Trash size={24} className="mt-0.5 flex-shrink-0 text-red-500" />
            <div className="min-w-0 flex-1">
              <h3 className="text-[17px] font-semibold text-red-700">Supprimer définitivement mon compte</h3>
              <p className="mt-1 text-[13px] leading-5 text-red-600">Cette action supprime votre compte Firebase et vos données personnelles.</p>
              {user?.email && <div className="mt-4"><label className={labelCls}>Mot de passe pour confirmer</label><input type="password" autoComplete="current-password" value={accountPassword} onChange={(event) => setAccountPassword(event.target.value)} className={`${inputCls} bg-white`} /></div>}
              <button type="button" onClick={handleDeleteAccount} disabled={isDeleting || !user} className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
                {isDeleting ? <CircleNotch size={18} className="animate-spin" /> : <Trash size={18} />} Supprimer mon compte
              </button>
            </div>
          </div>
        </section>
      </div>

      {message && <p className="mt-4 flex items-center justify-center gap-2 text-center text-[13px] text-green-600"><CheckCircle size={17} />{message}</p>}
      {error && <p className="mt-4 text-center text-[13px] text-red-600">{error}</p>}
    </div>
  );
}
