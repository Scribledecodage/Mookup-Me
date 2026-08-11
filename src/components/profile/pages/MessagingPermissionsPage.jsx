'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, CircleNotch, ChatCircle, UsersThree } from '@phosphor-icons/react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';

const selectCls = 'w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-[14px] text-gray-800 outline-none transition-colors focus:border-blue-500 focus:bg-white';

export default function MessagingPermissionsPage() {
  const [user] = useAuthState(auth);
  const [directMessages, setDirectMessages] = useState('everyone');
  const [groupInvites, setGroupInvites] = useState('everyone');
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return undefined;
    return onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      const permissions = snapshot.data()?.messagingPermissions || {};
      setDirectMessages(permissions.directMessages || 'everyone');
      setGroupInvites(permissions.groupInvites || 'everyone');
    });
  }, [user]);

  const savePermissions = async (event) => {
    event.preventDefault();
    if (!user) return;
    setIsSaving(true);
    setIsSuccess(false);
    setError('');
    try {
      await setDoc(doc(db, 'users', user.uid), {
        messagingPermissions: { directMessages, groupInvites },
        updatedAt: new Date(),
      }, { merge: true });
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 2500);
    } catch (saveError) {
      console.error('Erreur sauvegarde permissions:', saveError);
      setError('Impossible de sauvegarder ces préférences.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 pb-12 w-full max-w-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">Permissions de messagerie</h2>
        <p className="text-gray-500 text-[15px]">Choisissez qui peut vous contacter et vous ajouter à un groupe.</p>
      </div>

      <form onSubmit={savePermissions} className="space-y-3">
        <section className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <ChatCircle size={24} className="mt-0.5 flex-shrink-0 text-blue-500" />
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold text-gray-900">Messages privés</h3>
            <p className="mt-1 text-[13px] leading-5 text-gray-500">Choisissez qui peut démarrer une conversation avec vous.</p>
            <select value={directMessages} onChange={(event) => setDirectMessages(event.target.value)} className={`${selectCls} mt-3`}>
              <option value="everyone">Tout le monde</option>
              <option value="contacts">Mes contacts</option>
              <option value="nobody">Personne</option>
            </select>
          </div>
        </section>

        <section className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <UsersThree size={24} className="mt-0.5 flex-shrink-0 text-blue-500" />
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold text-gray-900">Invitations de groupe</h3>
            <p className="mt-1 text-[13px] leading-5 text-gray-500">Choisissez qui peut vous ajouter à une conversation de groupe.</p>
            <select value={groupInvites} onChange={(event) => setGroupInvites(event.target.value)} className={`${selectCls} mt-3`}>
              <option value="everyone">Tout le monde</option>
              <option value="contacts">Mes contacts</option>
              <option value="nobody">Personne</option>
            </select>
          </div>
        </section>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-[13px] text-red-600">{error}</p>}
        <button type="submit" disabled={isSaving || !user} className={`w-full rounded-lg py-2.5 font-bold transition-all flex items-center justify-center gap-2 ${isSuccess ? 'bg-green-500 text-white' : isSaving || !user ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>
          {isSaving ? <CircleNotch size={20} className="animate-spin" /> : isSuccess ? <><CheckCircle size={20} /> Préférences enregistrées</> : 'Enregistrer les préférences'}
        </button>
      </form>
    </div>
  );
}
