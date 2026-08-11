'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, CircleNotch, Eye, EyeSlash, UserCircle } from '@phosphor-icons/react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';

const DEFAULT_VISIBILITY = {
  profile: 'everyone',
  status: 'everyone',
  showBio: true,
  showPassions: true,
  showCity: true,
  showBirthday: true,
};

const selectCls = 'w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-[14px] text-gray-800 outline-none transition-colors focus:border-blue-500 focus:bg-white';

function VisibilityToggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative flex h-6 w-11 flex-shrink-0 appearance-none items-center overflow-hidden rounded-full border-0 p-0 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${checked ? 'bg-blue-500' : 'bg-gray-300'}`}
    >
      <span className={`absolute left-1 top-1 block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

export default function ProfileVisibilityPage() {
  const [user] = useAuthState(auth);
  const [visibility, setVisibility] = useState(DEFAULT_VISIBILITY);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return undefined;
    return onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      setVisibility({ ...DEFAULT_VISIBILITY, ...(snapshot.data()?.profileVisibility || {}) });
    });
  }, [user]);

  const updateVisibility = (key, value) => {
    setVisibility((current) => ({ ...current, [key]: value }));
    setIsSuccess(false);
  };

  const saveVisibility = async (event) => {
    event.preventDefault();
    if (!user) return;
    setIsSaving(true);
    setIsSuccess(false);
    setError('');
    try {
      await setDoc(doc(db, 'users', user.uid), { profileVisibility: visibility, updatedAt: new Date() }, { merge: true });
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 2500);
    } catch (saveError) {
      console.error('Erreur sauvegarde visibilité:', saveError);
      setError('Impossible de sauvegarder ces préférences.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 pb-12 w-full max-w-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">Visibilité</h2>
        <p className="text-gray-500 text-[15px]">Choisissez qui peut voir votre profil public.</p>
      </div>

      <form onSubmit={saveVisibility} className="space-y-3">
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3"><UserCircle size={24} className="flex-shrink-0 text-blue-500" /><div className="min-w-0 flex-1"><h3 className="text-[15px] font-semibold text-gray-900">Profil public</h3><p className="mt-1 text-[13px] leading-5 text-gray-500">Choisissez qui peut consulter votre profil.</p></div></div>
          <select value={visibility.profile} onChange={(event) => updateVisibility('profile', event.target.value)} className={`${selectCls} mt-3`}><option value="everyone">Tout le monde</option><option value="contacts">Mes contacts</option><option value="nobody">Personne</option></select>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3"><Eye size={24} className="flex-shrink-0 text-blue-500" /><div className="min-w-0 flex-1"><h3 className="text-[15px] font-semibold text-gray-900">Statut et activité</h3><p className="mt-1 text-[13px] leading-5 text-gray-500">Choisissez qui peut voir votre statut public.</p></div></div>
          <select value={visibility.status} onChange={(event) => updateVisibility('status', event.target.value)} className={`${selectCls} mt-3`}><option value="everyone">Tout le monde</option><option value="contacts">Mes contacts</option><option value="nobody">Personne</option></select>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-3"><EyeSlash size={24} className="flex-shrink-0 text-blue-500" /><div><h3 className="text-[15px] font-semibold text-gray-900">Informations personnelles</h3><p className="mt-1 text-[13px] leading-5 text-gray-500">Choisissez les informations affichées sur votre profil.</p></div></div>
          <div className="space-y-3">
            <label className="flex items-center justify-between gap-3 text-[13px] text-gray-700"><span>Bio</span><VisibilityToggle checked={visibility.showBio} onChange={(value) => updateVisibility('showBio', value)} label="Afficher ma bio" /></label>
            <label className="flex items-center justify-between gap-3 text-[13px] text-gray-700"><span>Passions</span><VisibilityToggle checked={visibility.showPassions} onChange={(value) => updateVisibility('showPassions', value)} label="Afficher mes passions" /></label>
            <label className="flex items-center justify-between gap-3 text-[13px] text-gray-700"><span>Ville</span><VisibilityToggle checked={visibility.showCity} onChange={(value) => updateVisibility('showCity', value)} label="Afficher ma ville" /></label>
            <label className="flex items-center justify-between gap-3 text-[13px] text-gray-700"><span>Date d’anniversaire</span><VisibilityToggle checked={visibility.showBirthday} onChange={(value) => updateVisibility('showBirthday', value)} label="Afficher ma date d’anniversaire" /></label>
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
