'use client';

import { Check, Desktop, ShieldCheck, X } from '@phosphor-icons/react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { db } from '@/lib/firebase';

type ConsentValue = 'unset' | 'enabled' | 'disabled';

type DesktopActivityConsentProps = {
  user: User | null | undefined;
};

export default function DesktopActivityConsent({ user }: DesktopActivityConsentProps) {
  const [isElectron, setIsElectron] = useState(false);
  const [consent, setConsent] = useState<ConsentValue | null>(null);
  const [activityPrivacy, setActivityPrivacy] = useState<Record<string, unknown>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [completedMessage, setCompletedMessage] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsElectron(window.electronAPI?.isElectron === true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!user || !isElectron) return undefined;

    return onSnapshot(doc(db, 'users', user.uid), snapshot => {
      const savedPrivacy = (snapshot.data()?.activityPrivacy || {}) as Record<string, unknown>;
      setActivityPrivacy(savedPrivacy);
      setConsent(
        savedPrivacy.desktopPromptConsent === 'enabled'
          ? 'enabled'
          : savedPrivacy.desktopPromptConsent === 'disabled' ? 'disabled' : 'unset',
      );
    }, () => setConsent('unset'));
  }, [user, isElectron]);

  const chooseConsent = async (value: Exclude<ConsentValue, 'unset'>) => {
    if (!user || isSaving) return;
    console.info('[System activity][consent-choice]', { value });
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        activityPrivacy: {
          ...activityPrivacy,
          desktopPromptConsent: value,
        },
      }, { merge: true });
      console.info('[System activity][consent-saved]', { value });
      setCompletedMessage(value === 'enabled'
        ? 'D’accord, Mookup vous demandera désormais avant d’afficher une application.'
        : 'Pas de problème. Vous pourrez réactiver cette option dans Profil → Confidentialité → Activité sur l’ordinateur.');
    } catch (error) {
      console.error('Impossible de sauvegarder le consentement d’activité desktop:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isElectron || !user || (consent !== 'unset' && !completedMessage)) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/25 px-4 backdrop-blur-[2px]">
      <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-2xl">
        {completedMessage ? (
          <>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <ShieldCheck size={26} weight="fill" />
            </div>
            <p className="text-[15px] leading-6 text-gray-600">{completedMessage}</p>
            <button type="button" onClick={() => setCompletedMessage('')} className="mt-5 w-full rounded-xl bg-blue-500 px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-blue-600">
              OK
            </button>
          </>
        ) : (
          <>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-700">
              <Desktop size={27} weight="fill" />
            </div>
            <h2 className="text-xl font-semibold">Autoriser les demandes d’activité ?</h2>
            <p className="mt-2 text-[14px] leading-6 text-gray-500">
              À chaque fois que vous ouvrez une nouvelle application, Mookup peut vous demander si vous souhaitez l’afficher comme activité sur votre profil.
            </p>
            <p className="mt-3 text-[13px] leading-5 text-gray-400">
              Vous pourrez modifier ce choix à tout moment dans les réglages de votre profil.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button type="button" disabled={isSaving} onClick={() => void chooseConsent('disabled')} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-[14px] font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50">
                <X size={17} /> Non
              </button>
              <button type="button" disabled={isSaving} onClick={() => void chooseConsent('enabled')} className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-50">
                <Check size={17} weight="bold" /> Oui
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
