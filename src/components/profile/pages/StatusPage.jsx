'use client';

import { useEffect, useRef, useState } from 'react';
import { CircleNotch, X } from '@phosphor-icons/react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';

const EMOJIS = ['😀', '😄', '😊', '😍', '😎', '🤩', '🥳', '🤔', '😴', '😤', '😭', '👍', '👏', '🙏', '🎧', '🎮', '📚', '💻', '🎨', '🎵', '🔥', '⭐', '✨', '⚡', '🌈', '🌙', '☀️'];

export default function StatusPage() {
  const [user] = useAuthState(auth);
  const [statusEmoji, setStatusEmoji] = useState('');
  const [statusText, setStatusText] = useState('');
  const [statusDuration, setStatusDuration] = useState('30');
  const [currentStatus, setCurrentStatus] = useState(null);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const emojiRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      const data = snapshot.data();
      if (!data?.statusText || !data.statusExpiresAt) return setCurrentStatus(null);
      const expiresAt = data.statusExpiresAt.toDate ? data.statusExpiresAt.toDate() : new Date(data.statusExpiresAt);
      setCurrentStatus(expiresAt > new Date() ? { emoji: data.statusEmoji || '', text: data.statusText, expiresAt } : null);
    });
  }, [user]);

  useEffect(() => {
    const handleClick = (event) => {
      if (emojiRef.current && !emojiRef.current.contains(event.target)) setIsEmojiOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const saveStatus = async () => {
    if (!user || !statusText.trim()) return;
    setIsSaving(true);
    try {
      const expiresAt = new Date(Date.now() + Number(statusDuration) * 60 * 1000);
      await setDoc(doc(db, 'users', user.uid), { statusEmoji, statusText: statusText.trim(), statusExpiresAt: expiresAt }, { merge: true });
      setStatusText('');
      setStatusEmoji('');
    } finally {
      setIsSaving(false);
    }
  };

  const clearStatus = async () => {
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid), { statusEmoji: '', statusText: '', statusExpiresAt: null }, { merge: true });
    setCurrentStatus(null);
  };

  return (
    <div className="p-6 w-full max-w-lg">
      <div className="mb-6"><h2 className="text-2xl font-semibold text-gray-900 mb-1">Statut</h2><p className="text-gray-500 text-[15px]">Partagez votre humeur et votre activité.</p></div>
      <div className="space-y-4">
        {currentStatus && <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg"><span>{currentStatus.emoji}</span><span className="text-[13px] text-blue-700 flex-1 truncate">{currentStatus.text}</span><button type="button" onClick={clearStatus} className="text-blue-500"><X size={15} /></button></div>}
        <div className="flex gap-2 items-center">
          <div className="relative" ref={emojiRef}>
            <button type="button" onClick={() => setIsEmojiOpen((open) => !open)} className="w-10 h-10 rounded-lg border border-gray-200 bg-gray-50 text-lg">{statusEmoji || '🙂'}</button>
            {isEmojiOpen && <div className="absolute z-50 mt-2 w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-lg grid grid-cols-7 gap-1">{EMOJIS.map((emoji) => <button key={emoji} type="button" onClick={() => { setStatusEmoji(emoji); setIsEmojiOpen(false); }} className="h-8 rounded hover:bg-gray-100">{emoji}</button>)}</div>}
          </div>
          <input type="text" placeholder="Ex : En réunion, Disponible…" value={statusText} onChange={(event) => setStatusText(event.target.value)} maxLength={60} className="flex-1 min-w-0 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-[14px]" />
          <select value={statusDuration} onChange={(event) => setStatusDuration(event.target.value)} className="px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-[13px]"><option value="30">30 min</option><option value="60">1 h</option><option value="120">2 h</option><option value="1440">24 h</option></select>
          <button type="button" onClick={saveStatus} disabled={!statusText.trim() || isSaving} className="px-3 py-2.5 bg-blue-500 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg text-[13px]">{isSaving ? <CircleNotch size={17} className="animate-spin" /> : 'OK'}</button>
        </div>
      </div>
    </div>
  );
}
