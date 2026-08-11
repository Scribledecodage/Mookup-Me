'use client';

import { useEffect, useState } from 'react';
import { reauthenticateWithCredential, EmailAuthProvider, signOut, updatePassword } from 'firebase/auth';
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { CheckCircle, CircleNotch, DeviceMobile, Laptop, Monitor, ShieldCheck, SignOut } from '@phosphor-icons/react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';

const inputCls = 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-[15px] transition-colors';
const labelCls = 'text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1 block mb-1';

function getSessionId() {
  if (typeof window === 'undefined') return '';
  try {
    const key = 'mookup_active_session_id';
    let id = window.sessionStorage.getItem(key);
    if (!id) {
      id = typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function getDeviceType() {
  if (typeof navigator === 'undefined') return 'desktop';
  return /iphone|ipad|ipod|android|mobile/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
}

function getDeviceLabel() {
  if (typeof navigator === 'undefined') return 'Appareil actuel';
  const userAgent = navigator.userAgent;
  const device = /iphone|ipad|ipod/i.test(userAgent) ? 'iPhone ou iPad' : /android/i.test(userAgent) ? 'Appareil Android' : /windows/i.test(userAgent) ? 'Ordinateur Windows' : /macintosh|mac os/i.test(userAgent) ? 'Mac' : 'Appareil';
  const browser = /edg/i.test(userAgent) ? 'Edge' : /chrome/i.test(userAgent) ? 'Chrome' : /firefox/i.test(userAgent) ? 'Firefox' : /safari/i.test(userAgent) ? 'Safari' : 'Navigateur web';
  return `${device} · ${browser}`;
}

function formatLastActive(timestamp) {
  const date = timestamp?.toDate ? timestamp.toDate() : timestamp ? new Date(timestamp) : null;
  if (!date || Number.isNaN(date.getTime())) return 'À l’instant';
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'À l’instant';
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  return `Il y a ${Math.floor(hours / 24)} j`;
}

export default function AccountSecurityPage() {
  const [user] = useAuthState(auth);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionsError, setSessionsError] = useState('');
  const [sessionId] = useState(getSessionId);

  useEffect(() => {
    if (!user || !sessionId) return undefined;

    const sessionRef = doc(db, 'users', user.uid, 'sessions', sessionId);
    const sessionData = {
      label: getDeviceLabel(),
      deviceType: getDeviceType(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      lastActiveAt: serverTimestamp(),
      revoked: false,
    };

    setDoc(sessionRef, { ...sessionData, createdAt: serverTimestamp() }, { merge: true }).catch(() => setSessionsError('Impossible de synchroniser les sessions.'));

    const heartbeat = window.setInterval(() => {
      setDoc(sessionRef, { lastActiveAt: serverTimestamp() }, { merge: true }).catch(() => {});
    }, 60_000);

    const stopIfRevoked = onSnapshot(sessionRef, (snapshot) => {
      if (snapshot.data()?.revoked) signOut(auth).catch(() => {});
    });
    const stopSessions = onSnapshot(collection(db, 'users', user.uid, 'sessions'), (snapshot) => {
      const nextSessions = snapshot.docs
        .map((session) => ({ id: session.id, ...session.data() }))
        .filter((session) => !session.revoked);
      nextSessions.sort((a, b) => {
        const aTime = a.lastActiveAt?.toMillis?.() || 0;
        const bTime = b.lastActiveAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
      setSessions(nextSessions);
    }, () => setSessionsError('Impossible de charger les sessions.'));

    return () => {
      window.clearInterval(heartbeat);
      stopIfRevoked();
      stopSessions();
    };
  }, [user, sessionId]);

  const revokeSession = async (targetSessionId) => {
    if (!user) return;
    const sessionRef = doc(db, 'users', user.uid, 'sessions', targetSessionId);
    setSessions((current) => current.filter((session) => session.id !== targetSessionId));
    try {
      if (targetSessionId === sessionId) {
        await deleteDoc(sessionRef);
        await signOut(auth);
        return;
      }
      await setDoc(sessionRef, { revoked: true, revokedAt: serverTimestamp() }, { merge: true });
      window.setTimeout(() => deleteDoc(sessionRef).catch(() => {}), 2000);
    } catch {
      setSessionsError('Impossible de déconnecter cette session.');
    }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess(false);

    if (!user?.email) {
      setError('Ce compte doit avoir une adresse email pour changer son mot de passe.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Le nouveau mot de passe doit contenir six caractères minimum.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }
    if (currentPassword === newPassword) {
      setError('Le nouveau mot de passe doit être différent de l’ancien.');
      return;
    }

    setIsSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (authError) {
      if (authError?.code === 'auth/wrong-password' || authError?.code === 'auth/invalid-credential') {
        setError('Le mot de passe actuel est incorrect.');
      } else if (authError?.code === 'auth/too-many-requests') {
        setError('Trop de tentatives. Réessayez plus tard.');
      } else {
        setError('Impossible de modifier le mot de passe pour le moment.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 pb-12 w-full max-w-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">Mot de passe et sécurité</h2>
        <p className="text-gray-500 text-[15px]">Confirmez votre identité avant toute modification.</p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-1 text-[17px] font-semibold text-gray-900">Modifier le mot de passe</h3>
        <p className="mb-5 text-[13px] leading-5 text-gray-500">Saisissez votre ancien mot de passe pour continuer.</p>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div><label className={labelCls}>Mot de passe actuel</label><input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className={inputCls} required /></div>
          <div><label className={labelCls}>Nouveau mot de passe</label><input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className={inputCls} minLength={6} required /></div>
          <div><label className={labelCls}>Confirmer le nouveau mot de passe</label><input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputCls} minLength={6} required /></div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-[13px] text-red-600">{error}</p>}
          <button type="submit" disabled={isSaving} className={`w-full rounded-lg py-2.5 font-bold transition-all flex items-center justify-center gap-2 ${success ? 'bg-green-500 text-white' : isSaving ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>
            {isSaving ? <CircleNotch size={20} className="animate-spin" /> : success ? <><CheckCircle size={20} /> Mot de passe modifié</> : 'Confirmer et modifier'}
          </button>
        </form>
      </section>

      <div className="mt-4 space-y-3">
        <section className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <ShieldCheck size={24} className="mt-0.5 flex-shrink-0 text-gray-400" />
          <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><h3 className="text-[15px] font-semibold text-gray-800">Double authentification</h3><span className="whitespace-nowrap text-[11px] text-gray-400">Bientôt disponible</span></div><p className="mt-1 text-[13px] leading-5 text-gray-500">Un code supplémentaire protégera votre compte après le mot de passe.</p></div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-start gap-3">
            <Monitor size={24} className="mt-0.5 flex-shrink-0 text-gray-400" />
            <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><h3 className="text-[15px] font-semibold text-gray-800">Sessions actives</h3><span className="whitespace-nowrap text-[11px] text-gray-400">{sessions.length} session{sessions.length > 1 ? 's' : ''}</span></div><p className="mt-1 text-[13px] leading-5 text-gray-500">Consultez les appareils connectés et déconnectez ceux que vous ne reconnaissez pas.</p></div>
          </div>
          {sessionsError && <p className="mt-3 text-[12px] text-red-500">{sessionsError}</p>}
          <div className="mt-3 space-y-2">
            {sessions.length === 0 && <p className="rounded-lg bg-white px-3 py-2 text-[13px] text-gray-500">Chargement des sessions…</p>}
            {sessions.map((session) => {
              const isCurrent = session.id === sessionId;
              const isMobile = session.deviceType === 'mobile' || /iphone|ipad|ipod|android|mobile/i.test(session.userAgent || session.label || '');
              const SessionIcon = isMobile ? DeviceMobile : Laptop;
              return (
                <div key={session.id} className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <SessionIcon size={18} className="flex-shrink-0 text-gray-500" />
                    <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium text-gray-800">{session.label || 'Appareil connecté'} {isCurrent && <span className="font-normal text-blue-500">(cet appareil)</span>}</p><p className="text-[11px] text-gray-400">{formatLastActive(session.lastActiveAt)}</p></div>
                  </div>
                  <button type="button" onClick={(event) => { event.stopPropagation(); revokeSession(session.id); }} className="relative z-10 flex min-h-9 w-full touch-manipulation items-center justify-center gap-1 rounded-md px-3 py-2 text-[12px] text-red-500 hover:bg-red-50 sm:w-auto sm:py-1">
                    <SignOut size={14} /> Déconnecter
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
