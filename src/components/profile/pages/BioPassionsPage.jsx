'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, CircleNotch } from '@phosphor-icons/react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';

const fieldCls = 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-[15px] transition-colors';
const labelCls = 'text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1 block mb-1';

export default function BioPassionsPage() {
  const [user] = useAuthState(auth);
  const [data, setData] = useState({ bio: '', birthday: '', passions: '', city: '', pronouns: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      const value = snapshot.data() || {};
      setData({ bio: value.bio || '', birthday: value.birthday || '', passions: value.passions || '', city: value.city || '', pronouns: value.pronouns || '' });
    });
  }, [user]);

  const update = (key, value) => setData((current) => ({ ...current, [key]: value }));
  const save = async (event) => {
    event.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid), { ...data, updatedAt: new Date() }, { merge: true });
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 w-full max-w-lg">
      <div className="mb-6"><h2 className="text-2xl font-semibold text-gray-900 mb-1">Bio & passions</h2><p className="text-gray-500 text-[15px]">Ces informations sont visibles par vos contacts.</p></div>
      <form onSubmit={save} className="space-y-4">
        <div><label className={labelCls}>Bio</label><textarea placeholder="Parlez un peu de vous…" value={data.bio} onChange={(event) => update('bio', event.target.value)} rows={3} maxLength={200} className={`${fieldCls} resize-none`} /><p className="text-[11px] text-gray-400 text-right pr-1 mt-0.5">{data.bio.length}/200</p></div>
        <div><label className={labelCls}>Date d&apos;anniversaire</label><input type="date" value={data.birthday} onChange={(event) => update('birthday', event.target.value)} className={fieldCls} /></div>
        <div><label className={labelCls}>Passions / Centres d&apos;intérêt</label><input type="text" placeholder="Ex : Musique, Gaming, Voyage…" value={data.passions} onChange={(event) => update('passions', event.target.value)} maxLength={100} className={fieldCls} /></div>
        <div><label className={labelCls}>Ville</label><input type="text" placeholder="Ex : Paris, Lyon, Montréal…" value={data.city} onChange={(event) => update('city', event.target.value)} maxLength={100} className={fieldCls} /></div>
        <div><label className={labelCls}>Pronoms</label><input type="text" placeholder="Ex : il/lui, elle/la, ils/eux…" value={data.pronouns} onChange={(event) => update('pronouns', event.target.value)} maxLength={40} className={fieldCls} /></div>
        <button type="submit" disabled={isSaving} className={`w-full py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 ${isSuccess ? 'bg-blue-500 text-white' : isSaving ? 'bg-gray-200 text-gray-400' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>{isSaving ? <CircleNotch size={20} className="animate-spin" /> : isSuccess ? <><CheckCircle size={20} /> Enregistré</> : 'Enregistrer'}</button>
      </form>
    </div>
  );
}
