'use client';

import { useEffect, useState } from 'react';
import { CalendarBlank, CheckCircle, CircleNotch, Clock, Translate } from '@phosphor-icons/react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';

const DEFAULT_PREFERENCES = {
  language: 'fr',
  timezone: 'Europe/Paris',
  dateFormat: 'dd/mm/yyyy',
  timeFormat: '24',
};

const TIMEZONES = [
  'Europe/Paris',
  'Europe/London',
  'Europe/Brussels',
  'America/Montreal',
  'America/New_York',
  'America/Los_Angeles',
  'Africa/Casablanca',
  'Asia/Tokyo',
];

const selectCls = 'w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-[14px] text-gray-800 outline-none transition-colors focus:border-blue-500 focus:bg-white';

export default function LanguageTimePage() {
  const [user] = useAuthState(auth);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return undefined;
    return onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      setPreferences({ ...DEFAULT_PREFERENCES, ...(snapshot.data()?.languageTimePreferences || {}) });
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
      await setDoc(doc(db, 'users', user.uid), { languageTimePreferences: preferences, updatedAt: new Date() }, { merge: true });
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 2500);
    } catch (saveError) {
      console.error('Erreur sauvegarde langue et heure:', saveError);
      setError('Impossible de sauvegarder ces préférences.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 pb-12 w-full max-w-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">Langue et heure</h2>
        <p className="text-gray-500 text-[15px]">Adaptez Mookup à votre région et à vos habitudes.</p>
      </div>

      <form onSubmit={savePreferences} className="space-y-3">
        <section className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><Translate size={24} className="flex-shrink-0 text-blue-500" /><div className="min-w-0 flex-1"><h3 className="text-[15px] font-semibold text-gray-900">Langue de l’application</h3><p className="mt-1 text-[13px] text-gray-500">Choisissez la langue utilisée dans les menus.</p><select value={preferences.language} onChange={(event) => updatePreference('language', event.target.value)} className={`${selectCls} mt-3`}><option value="fr">Français</option><option value="en">English</option></select></div></section>

        <section className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><Clock size={24} className="flex-shrink-0 text-blue-500" /><div className="min-w-0 flex-1"><h3 className="text-[15px] font-semibold text-gray-900">Fuseau horaire</h3><p className="mt-1 text-[13px] text-gray-500">Utilisé pour afficher les heures des messages et appels.</p><select value={preferences.timezone} onChange={(event) => updatePreference('timezone', event.target.value)} className={`${selectCls} mt-3`}>{TIMEZONES.map((timezone) => <option key={timezone} value={timezone}>{timezone.replace('_', ' ')}</option>)}</select></div></section>

        <section className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><CalendarBlank size={24} className="flex-shrink-0 text-blue-500" /><div className="min-w-0 flex-1"><h3 className="text-[15px] font-semibold text-gray-900">Format de date</h3><p className="mt-1 text-[13px] text-gray-500">Choisissez l’ordre d’affichage des dates.</p><select value={preferences.dateFormat} onChange={(event) => updatePreference('dateFormat', event.target.value)} className={`${selectCls} mt-3`}><option value="dd/mm/yyyy">Jour / mois / année</option><option value="mm/dd/yyyy">Mois / jour / année</option><option value="yyyy-mm-dd">Année / mois / jour</option></select></div></section>

        <section className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><Clock size={24} className="flex-shrink-0 text-blue-500" /><div className="min-w-0 flex-1"><h3 className="text-[15px] font-semibold text-gray-900">Format de l’heure</h3><p className="mt-1 text-[13px] text-gray-500">Choisissez l’affichage sur 12 ou 24 heures.</p><select value={preferences.timeFormat} onChange={(event) => updatePreference('timeFormat', event.target.value)} className={`${selectCls} mt-3`}><option value="24">24 heures, exemple : 18:30</option><option value="12">12 heures, exemple : 6:30 PM</option></select></div></section>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-[13px] text-red-600">{error}</p>}
        <button type="submit" disabled={isSaving || !user} className={`w-full rounded-lg py-2.5 font-bold transition-all flex items-center justify-center gap-2 ${isSuccess ? 'bg-green-500 text-white' : isSaving || !user ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>{isSaving ? <CircleNotch size={20} className="animate-spin" /> : isSuccess ? <><CheckCircle size={20} /> Préférences enregistrées</> : 'Enregistrer les préférences'}</button>
      </form>
    </div>
  );
}
