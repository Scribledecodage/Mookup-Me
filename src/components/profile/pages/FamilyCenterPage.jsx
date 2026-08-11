'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, CircleNotch, Info, Trash, UserPlus, UsersThree } from '@phosphor-icons/react';
import { collection, doc, getDocs, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';

const DEFAULT_SETTINGS = { members: [] };

export default function FamilyCenterPage() {
  const [user] = useAuthState(auth);
  const [members, setMembers] = useState([]);
  const [memberEmail, setMemberEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return undefined;
    return onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      setMembers(snapshot.data()?.familySettings?.members || DEFAULT_SETTINGS.members);
    });
  }, [user]);

  const saveMembers = async (nextMembers) => {
    if (!user) return;
    setIsSaving(true);
    setError('');
    try {
      await setDoc(doc(db, 'users', user.uid), { familySettings: { members: nextMembers }, updatedAt: new Date() }, { merge: true });
      setMessage('Membres de la famille enregistrés.');
      setTimeout(() => setMessage(''), 2500);
    } catch (saveError) {
      console.error('Erreur sauvegarde membres familiaux:', saveError);
      setError('Impossible de sauvegarder les membres.');
    } finally {
      setIsSaving(false);
    }
  };

  const addMember = async (event) => {
    event.preventDefault();
    if (!user || !memberEmail.trim()) return;
    setIsAdding(true);
    setError('');
    setMessage('');
    try {
      const memberSnapshot = await getDocs(query(collection(db, 'users'), where('email', '==', memberEmail.trim().toLowerCase())));
      const memberDocument = memberSnapshot.docs[0];
      if (!memberDocument) {
        setError('Aucun compte ne correspond à cet email.');
        return;
      }
      if (memberDocument.id === user.uid) {
        setError('Vous ne pouvez pas vous ajouter vous-même.');
        return;
      }
      if (members.some((member) => member.uid === memberDocument.id)) {
        setError('Cette personne est déjà dans votre famille.');
        return;
      }
      const data = memberDocument.data();
      const nextMembers = [...members, { uid: memberDocument.id, email: data.email || memberEmail.trim(), displayName: data.displayName || data.nickname || 'Utilisateur', addedAt: new Date() }];
      setMembers(nextMembers);
      await saveMembers(nextMembers);
      setMemberEmail('');
    } catch (addError) {
      console.error('Erreur ajout membre familial:', addError);
      setError('Impossible d’ajouter ce membre.');
    } finally {
      setIsAdding(false);
    }
  };

  const removeMember = async (memberUid) => {
    if (!window.confirm('Retirer cette personne de votre famille ?')) return;
    const nextMembers = members.filter((member) => member.uid !== memberUid);
    setMembers(nextMembers);
    await saveMembers(nextMembers);
  };

  return (
    <div className="p-6 pb-12 w-full max-w-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">Centre familial</h2>
        <p className="text-gray-500 text-[15px]">Gérez les proches associés à votre espace Mookup.</p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <UsersThree size={24} className="flex-shrink-0 text-blue-500" />
          <div><h3 className="text-[15px] font-semibold text-gray-900">Membres de la famille</h3><p className="mt-1 text-[13px] text-gray-500">Ajoutez les comptes qui font partie de votre famille.</p></div>
        </div>
        <form onSubmit={addMember} className="flex gap-2">
          <input type="email" value={memberEmail} onChange={(event) => setMemberEmail(event.target.value)} placeholder="Email du membre" className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-[13px] outline-none focus:border-blue-500" required />
          <button type="submit" disabled={isAdding || isSaving || !user} className="flex items-center justify-center gap-1 rounded-lg bg-blue-500 px-3 py-2.5 text-[13px] font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400">{isAdding ? <CircleNotch size={17} className="animate-spin" /> : <UserPlus size={17} />} Ajouter</button>
        </form>
        <div className="mt-3 space-y-2">
          {members.length === 0 ? <p className="rounded-lg bg-gray-50 px-3 py-2.5 text-center text-[13px] text-gray-500">Aucun membre ajouté.</p> : members.map((member) => <div key={member.uid} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-[12px] font-semibold text-blue-600">{(member.displayName || 'U').charAt(0).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium text-gray-800">{member.displayName}</p><p className="truncate text-[11px] text-gray-400">{member.email}</p></div><button type="button" onClick={() => removeMember(member.uid)} className="rounded-md p-2 text-red-500 hover:bg-red-50" aria-label={`Retirer ${member.displayName}`}><Trash size={16} /></button></div>)}
        </div>
      </section>

      <section className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-start gap-3"><Info size={23} className="mt-0.5 flex-shrink-0 text-gray-400" /><div><h3 className="text-[15px] font-semibold text-gray-800">Invitations et rôles familiaux</h3><p className="mt-1 text-[13px] leading-5 text-gray-500">Les invitations, les rôles et les réglages partagés seront disponibles dans une prochaine version.</p></div></div>
      </section>

      <div className="mt-4 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4"><Info size={22} className="mt-0.5 flex-shrink-0 text-blue-500" /><div><p className="text-[14px] font-semibold text-blue-800">Fonctionnalité en cours de développement</p><p className="mt-1 text-[12px] leading-5 text-blue-700">La gestion familiale avancée arrivera progressivement sur Mookup.</p></div></div>

      {message && <p className="mt-4 flex items-center justify-center gap-2 text-center text-[13px] text-green-600"><CheckCircle size={17} />{message}</p>}
      {error && <p className="mt-4 text-center text-[13px] text-red-600">{error}</p>}
    </div>
  );
}
