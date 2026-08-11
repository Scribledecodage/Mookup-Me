'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, CircleNotch, Eye, EyeSlash, Pulse } from '@phosphor-icons/react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';

const DEFAULT_PREFERENCES = {
  showOnlineStatus: true,
  showLastActivity: true,
  readReceipts: true,
};

function PreferenceToggle({ checked, onChange, label }) {
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

export default function ActivityPrivacyPage() {
  const [user] = useAuthState(auth);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return undefined;
    return onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      setPreferences({ ...DEFAULT_PREFERENCES, ...(snapshot.data()?.activityPrivacy || {}) });
    });
  }, [user]);

  const updatePreference = (key, value) => {
    setPreferences((current) => ({ ...current, [key]: value }));
    setIsSuccess(false);
  };

  const savePreferences = async (event) => {
    event.preventDefault();
    if (!user) return;
    setIsSaving(true);
    setIsSuccess(false);
    setError('');
    try {
      await setDoc(doc(db, 'users', user.uid), { activityPrivacy: preferences, updatedAt: new Date() }, { merge: true });
      await setDoc(doc(db, 'status', user.uid), { visible: preferences.showOnlineStatus, showLastActivity: preferences.showLastActivity }, { merge: true });
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 2500);
    } catch (saveError) {
      console.error('Erreur sauvegarde confidentialité activité:', saveError);
      setError('Impossible de sauvegarder ces préférences.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 pb-12 w-full max-w-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">Confidentialité des activités</h2>
        <p className="text-gray-500 text-[15px]">Contrôlez ce que vos contacts peuvent voir de votre activité.</p>
      </div>

      <form onSubmit={savePreferences} className="space-y-3">
        <section className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <Pulse size={24} className="flex-shrink-0 text-blue-500" />
          <div className="min-w-0 flex-1"><h3 className="text-[15px] font-semibold text-gray-900">Présence en ligne</h3><p className="mt-1 text-[13px] leading-5 text-gray-500">Permettre à vos contacts de voir quand vous êtes en ligne.</p></div>
          <PreferenceToggle checked={preferences.showOnlineStatus} onChange={(value) => updatePreference('showOnlineStatus', value)} label="Afficher ma présence en ligne" />
        </section>

        <section className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <Eye size={24} className="flex-shrink-0 text-blue-500" />
          <div className="min-w-0 flex-1"><h3 className="text-[15px] font-semibold text-gray-900">Dernière activité</h3><p className="mt-1 text-[13px] leading-5 text-gray-500">Permettre à vos contacts de voir votre dernière connexion.</p></div>
          <PreferenceToggle checked={preferences.showLastActivity} onChange={(value) => updatePreference('showLastActivity', value)} label="Afficher ma dernière activité" />
        </section>

        <section className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <EyeSlash size={24} className="flex-shrink-0 text-blue-500" />
          <div className="min-w-0 flex-1"><h3 className="text-[15px] font-semibold text-gray-900">Confirmations de lecture</h3><p className="mt-1 text-[13px] leading-5 text-gray-500">Indiquer à vos contacts quand vous avez lu leurs messages.</p></div>
          <PreferenceToggle checked={preferences.readReceipts} onChange={(value) => updatePreference('readReceipts', value)} label="Afficher les confirmations de lecture" />
        </section>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-[13px] text-red-600">{error}</p>}
        <button type="submit" disabled={isSaving || !user} className={`w-full rounded-lg py-2.5 font-bold transition-all flex items-center justify-center gap-2 ${isSuccess ? 'bg-green-500 text-white' : isSaving || !user ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>
          {isSaving ? <CircleNotch size={20} className="animate-spin" /> : isSuccess ? <><CheckCircle size={20} /> Préférences enregistrées</> : 'Enregistrer les préférences'}
        </button>
      </form>
    </div>
  );
}
