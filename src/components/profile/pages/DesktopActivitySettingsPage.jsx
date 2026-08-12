'use client';

import { CheckCircle, CircleNotch, Desktop, ShieldCheck } from '@phosphor-icons/react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';

function PreferenceToggle({ checked, disabled, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative flex h-6 w-11 flex-shrink-0 items-center overflow-hidden rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-blue-500' : 'bg-gray-300'}`}
    >
      <span className={`absolute left-1 top-1 block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

export default function DesktopActivitySettingsPage() {
  const [user] = useAuthState(auth);
  const [isElectron, setIsElectron] = useState(false);
  const [activityPrivacy, setActivityPrivacy] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsElectron(window.electronAPI?.isElectron === true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!user || !isElectron) return undefined;
    return onSnapshot(doc(db, 'users', user.uid), snapshot => {
      setActivityPrivacy(snapshot.data()?.activityPrivacy || {});
    }, () => setActivityPrivacy({}));
  }, [user, isElectron]);

  const isEnabled = activityPrivacy?.desktopPromptConsent === 'enabled';

  const updatePromptPreference = async (enabled) => {
    if (!user || !activityPrivacy || isSaving) return;
    setIsSaving(true);
    setIsSuccess(false);
    setError('');
    const nextPrivacy = { ...activityPrivacy, desktopPromptConsent: enabled ? 'enabled' : 'disabled' };
    setActivityPrivacy(nextPrivacy);
    try {
      await setDoc(doc(db, 'users', user.uid), { activityPrivacy: nextPrivacy }, { merge: true });
      setIsSuccess(true);
      window.setTimeout(() => setIsSuccess(false), 2200);
    } catch (saveError) {
      console.error('Impossible de sauvegarder les demandes d’activité:', saveError);
      setError('Impossible de sauvegarder ce réglage.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isElectron) return null;

  return (
    <div className="w-full max-w-lg p-6 pb-12">
      <div className="mb-6">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <Desktop size={27} weight="fill" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900">Activité sur l’ordinateur</h2>
        <p className="mt-1 text-[15px] leading-6 text-gray-500">Choisissez si Mookup doit vous demander avant d’afficher l’application que vous utilisez sur votre profil.</p>
      </div>

      <section className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <ShieldCheck size={24} className="flex-shrink-0 text-blue-500" />
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold text-gray-900">Demandes d’activité</h3>
          <p className="mt-1 text-[13px] leading-5 text-gray-500">Afficher une petite demande lorsque vous ouvrez une nouvelle application.</p>
        </div>
        <PreferenceToggle checked={isEnabled} disabled={!activityPrivacy || isSaving} onChange={value => void updatePromptPreference(value)} />
      </section>

      <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-[13px] leading-5 text-gray-500">
        {isEnabled
          ? 'Lorsque vous acceptez une application, elle devient visible comme activité sur votre profil. Vous pourrez la retirer en revenant sur Mookup ou en désactivant ce réglage.'
          : 'Aucune demande ne sera affichée. Vous pouvez réactiver cette option à tout moment.'}
      </div>

      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-center text-[13px] text-red-600">{error}</p>}
      {isSuccess && <p className="mt-3 flex items-center justify-center gap-2 text-[13px] font-medium text-green-600"><CheckCircle size={17} /> Préférence enregistrée</p>}
      {isSaving && <p className="mt-3 flex items-center justify-center gap-2 text-[13px] text-gray-400"><CircleNotch size={16} className="animate-spin" /> Enregistrement…</p>}
    </div>
  );
}
