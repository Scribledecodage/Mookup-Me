'use client';

import { useEffect, useState } from 'react';
import { Bell, BellRinging, CheckCircle, CircleNotch, PhoneCall, SpeakerHigh } from '@phosphor-icons/react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';

const DEFAULT_PREFERENCES = {
  messagesGroups: true,
  calls: true,
  sounds: true,
  browser: true,
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

export default function NotificationsPage() {
  const [user] = useAuthState(auth);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [browserPermission, setBrowserPermission] = useState('unknown');
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return undefined;
    return onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      setPreferences({ ...DEFAULT_PREFERENCES, ...(snapshot.data()?.notificationPreferences || {}) });
    });
  }, [user]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return undefined;
    const timer = window.setTimeout(() => setBrowserPermission(Notification.permission), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const updatePreference = (key, value) => {
    setPreferences((current) => ({ ...current, [key]: value }));
    setIsSuccess(false);
  };

  const requestBrowserPermission = async () => {
    if (!('Notification' in window)) {
      setError('Les notifications navigateur ne sont pas disponibles ici.');
      return;
    }
    const permission = await Notification.requestPermission();
    setBrowserPermission(permission);
    if (permission !== 'granted') setError('Autorisez les notifications dans les réglages du navigateur.');
    else setError('');
  };

  const savePreferences = async (event) => {
    event.preventDefault();
    if (!user) return;
    setIsSaving(true);
    setIsSuccess(false);
    setError('');
    try {
      await setDoc(doc(db, 'users', user.uid), { notificationPreferences: preferences, updatedAt: new Date() }, { merge: true });
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 2500);
    } catch (saveError) {
      console.error('Erreur sauvegarde notifications:', saveError);
      setError('Impossible de sauvegarder ces préférences.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 pb-12 w-full max-w-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">Notifications</h2>
        <p className="text-gray-500 text-[15px]">Choisissez les alertes que vous souhaitez recevoir.</p>
      </div>

      <form onSubmit={savePreferences} className="space-y-3">
        <section className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <BellRinging size={24} className="flex-shrink-0 text-blue-500" />
          <div className="min-w-0 flex-1"><h3 className="text-[15px] font-semibold text-gray-900">Messages et groupes</h3><p className="mt-1 text-[13px] leading-5 text-gray-500">Recevoir une alerte pour les nouveaux messages.</p></div>
          <PreferenceToggle checked={preferences.messagesGroups} onChange={(value) => updatePreference('messagesGroups', value)} label="Notifications des messages et groupes" />
        </section>

        <section className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <PhoneCall size={24} className="flex-shrink-0 text-blue-500" />
          <div className="min-w-0 flex-1"><h3 className="text-[15px] font-semibold text-gray-900">Appels</h3><p className="mt-1 text-[13px] leading-5 text-gray-500">Recevoir une alerte pour les appels entrants.</p></div>
          <PreferenceToggle checked={preferences.calls} onChange={(value) => updatePreference('calls', value)} label="Notifications des appels" />
        </section>

        <section className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <SpeakerHigh size={24} className="flex-shrink-0 text-blue-500" />
          <div className="min-w-0 flex-1"><h3 className="text-[15px] font-semibold text-gray-900">Sons</h3><p className="mt-1 text-[13px] leading-5 text-gray-500">Jouer un son lors d’une nouvelle notification.</p></div>
          <PreferenceToggle checked={preferences.sounds} onChange={(value) => updatePreference('sounds', value)} label="Sons des notifications" />
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3"><Bell size={24} className="flex-shrink-0 text-blue-500" /><div className="min-w-0 flex-1"><h3 className="text-[15px] font-semibold text-gray-900">Navigateur</h3><p className="mt-1 text-[13px] leading-5 text-gray-500">Afficher les alertes même quand Mookup est en arrière-plan.</p></div><PreferenceToggle checked={preferences.browser} onChange={(value) => updatePreference('browser', value)} label="Notifications du navigateur" /></div>
          <button type="button" onClick={requestBrowserPermission} className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">{browserPermission === 'granted' ? 'Notifications navigateur activées' : 'Autoriser les notifications navigateur'}</button>
        </section>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-[13px] text-red-600">{error}</p>}
        <button type="submit" disabled={isSaving || !user} className={`w-full rounded-lg py-2.5 font-bold transition-all flex items-center justify-center gap-2 ${isSuccess ? 'bg-green-500 text-white' : isSaving || !user ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>
          {isSaving ? <CircleNotch size={20} className="animate-spin" /> : isSuccess ? <><CheckCircle size={20} /> Préférences enregistrées</> : 'Enregistrer les préférences'}
        </button>
      </form>
    </div>
  );
}
