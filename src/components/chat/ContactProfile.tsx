'use client';

import React, { useState, useEffect } from 'react';
import { CaretLeft, ChatCircle, PhoneCall, VideoCamera, CalendarBlank, Users, Clock, Heart, MapPin, Tag, Desktop, DeviceMobile } from '@phosphor-icons/react';
import UserAvatar from '@/components/ui/UserAvatar';
import { OnlineUser } from '@/lib/presence';
import { extractColors, buildMeshGradient, buildMeshGradientFromColor } from '@/lib/colorUtils';
import { getUserColor } from '@/lib/getUserColor';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';

interface ContactProfileProps {
  displayName: string;
  displayAvatar?: string | null;
  otherUserId: string;
  onlineUsers: OnlineUser[];
  contactFullData: any | null;
  friendsSince: Date | null;
  onClose: () => void;
  onStartCall: (type: 'audio' | 'video') => void;
}

type ProfileTab = 'tableau' | 'activite';

// Seuil pour considérer quelqu'un en ligne (45s, cohérent avec presence.ts)
const ONLINE_THRESHOLD = 45000;

function useLastSeen(uid: string): { lastSeen: Date | null; isOnlineNow: boolean } {
  const [lastSeen, setLastSeen] = useState<Date | null>(null);
  const [isOnlineNow, setIsOnlineNow] = useState(false);

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(doc(db, 'status', uid), (snap) => {
      if (!snap.exists()) { setLastSeen(null); setIsOnlineNow(false); return; }
      const data = snap.data();
      const ts = data.lastSeen as Timestamp | undefined;
      if (ts) {
        const date = ts.toDate();
        setLastSeen(data.showLastActivity === false ? null : date);
        setIsOnlineNow(
          data.visible !== false &&
          data.state === 'online' &&
          Date.now() - date.getTime() < ONLINE_THRESHOLD
        );
      }
    });
    return () => unsub();
  }, [uid]);

  return { lastSeen, isOnlineNow };
}

function useBanner(src: string | null | undefined, uid: string): string {
  const [banner, setBanner] = useState(() => buildMeshGradientFromColor(getUserColor(uid)));

  useEffect(() => {
    if (!src) {
      setBanner(buildMeshGradientFromColor(getUserColor(uid)));
      return;
    }
    let cancelled = false;
    extractColors(src).then(colors => {
      if (!cancelled) setBanner(buildMeshGradient(colors));
    });
    return () => { cancelled = true; };
  }, [src, uid]);

  return banner;
}

function useUserStatus(uid: string): { statusText: string | null; statusEmoji: string } {
  const [statusText, setStatusText] = useState<string | null>(null);
  const [statusEmoji, setStatusEmoji] = useState('');

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(doc(db, 'users', uid), (snap) => {
      if (!snap.exists()) {
        setStatusText(null);
        setStatusEmoji('');
        return;
      }
      const data = snap.data();
      const visibility = data.profileVisibility || {};
      if (visibility.profile === 'nobody' || visibility.status === 'nobody') {
        setStatusText(null);
        setStatusEmoji('');
        return;
      }
      if (data.statusText && data.statusExpiresAt) {
        const exp = data.statusExpiresAt.toDate ? data.statusExpiresAt.toDate() : new Date(data.statusExpiresAt);
        const isActive = exp > new Date();
        setStatusText(isActive ? data.statusText : null);
        setStatusEmoji(isActive ? data.statusEmoji || '' : '');
      } else {
        setStatusText(null);
        setStatusEmoji('');
      }
    });
    return () => unsub();
  }, [uid]);

  return { statusText, statusEmoji };
}

export default function ContactProfile({
  displayName,
  displayAvatar,
  otherUserId,
  onlineUsers,
  contactFullData,
  friendsSince,
  onClose,
  onStartCall,
}: ContactProfileProps) {
  const [tab, setTab] = useState<ProfileTab>('tableau');
  const banner = useBanner(displayAvatar, otherUserId);
  const onlineInfo = onlineUsers.find(u => u.uid === otherUserId);
  const { lastSeen, isOnlineNow } = useLastSeen(otherUserId);
  const { statusText, statusEmoji } = useUserStatus(otherUserId);
  const isShortStatus = Boolean(statusText && statusText.length <= 28);
  const profileVisibility = contactFullData?.profileVisibility || {};
  const canShowProfile = profileVisibility.profile !== 'nobody';
  const canShowField = (field: string) => canShowProfile && profileVisibility[field] !== false;

  const formatDate = (raw: any) => {
    const d = raw?.toDate ? raw.toDate() : new Date(raw);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatLastSeen = (d: Date): string => {
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }) + ' à ' + d.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#f2f3f5]">

      {/* Bouton retour flottant */}
      <button
        onClick={onClose}
        className="absolute top-3 left-3 z-20 p-2 bg-white/80 backdrop-blur-sm text-gray-600 hover:bg-white rounded-full shadow transition-all"
      >
        <CaretLeft size={20} />
      </button>

      <div className="flex-1 overflow-y-auto">

        {/* ── Bannière + avatar ── */}
        <div className="relative">
          <div
            className="w-full transition-all duration-700"
            style={{ background: banner, height: '140px' }}
          />

          <div className="px-5 -mt-10 flex items-end justify-between pb-3">
            {/* Avatar */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-[#f2f3f5] bg-gray-200 overflow-hidden shadow-md flex items-center justify-center">
                {displayAvatar
                  ? <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" />
                  : <UserAvatar uid={otherUserId} photoURL={null} displayName={displayName} size={80} />
                }
              </div>
              <div className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-[#f2f3f5] ${onlineInfo ? 'bg-blue-500' : 'bg-gray-400'}`} />
              {/* Bulle de statut, avec l’emoji choisi dans la section Statut */}
              {statusText && (
                <div className="absolute left-[calc(100%+10px)] top-1/2 z-20 -translate-y-1/2">
                  <div className={`bg-white px-4 py-2.5 text-gray-800 shadow-[0_5px_18px_rgba(0,0,0,0.13)] ring-1 ring-black/[0.04] ${isShortStatus ? 'w-max whitespace-nowrap rounded-full' : 'w-max max-w-[230px] rounded-2xl'}`}>
                    <span className="flex items-center gap-2 text-[13px] font-medium leading-[1.35]">
                      {statusEmoji && <span className="shrink-0 text-[17px] leading-none" role="img" aria-label="Emoji du statut">{statusEmoji}</span>}
                      <span className={isShortStatus ? 'whitespace-nowrap' : 'break-words'}>{statusText}</span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Boutons d'action */}
            <div className="flex gap-2 mb-1">
              <button
                onClick={onClose}
                className="px-3 py-1.5 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded-lg text-[13px] font-medium transition-colors flex items-center gap-1.5"
              >
                <ChatCircle size={14} />
                Message
              </button>
              <button
                onClick={() => onStartCall('audio')}
                className="p-2 bg-white hover:bg-gray-100 rounded-lg shadow-sm transition-colors"
                title="Appel vocal"
              >
                <PhoneCall size={16} className="text-gray-600" />
              </button>
              <button
                onClick={() => onStartCall('video')}
                className="p-2 bg-white hover:bg-gray-100 rounded-lg shadow-sm transition-colors"
                title="Appel vidéo"
              >
                <VideoCamera size={16} className="text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Deux colonnes (desktop) / une colonne (mobile) ── */}
        <div className="px-4 pb-6 flex flex-col md:flex-row gap-4 md:items-start">

          {/* ── Colonne gauche : infos ── */}
          <div className="md:w-[240px] md:flex-shrink-0 flex flex-col gap-3">

            {/* Nom + statut + pronoms */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="text-[20px] font-bold text-gray-900 leading-tight break-words">
                {displayName}
              </h2>
              {contactFullData?.pronouns ? (
                <p className="text-[12px] text-gray-400 mt-0.5">{contactFullData.pronouns}</p>
              ) : null}
              {onlineInfo ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-[19px] h-[19px] bg-white rounded-full border border-gray-200 shadow-sm flex items-center justify-center flex-shrink-0">
                    {onlineInfo.device === 'phone' ? (
                      <DeviceMobile size={11} className="text-blue-500" />
                    ) : (
                      <Desktop size={11} className="text-blue-500" />
                    )}
                  </div>
                  <span className="text-[12px] text-blue-500 font-medium">En ligne</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 mt-1">
                  <div className="w-[9px] h-[9px] bg-gray-400 rounded-full flex-shrink-0" />
                  <span className="text-[11px] text-gray-400">Hors ligne</span>
                </div>
              )}
            </div>

            {/* Membre depuis */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Membre depuis</p>
              <div className="flex items-center gap-2 text-[13px] text-gray-700">
                <CalendarBlank size={14} className="text-gray-400 flex-shrink-0" />
                {contactFullData?.createdAt
                  ? <span>{formatDate(contactFullData.createdAt)}</span>
                  : <span className="text-gray-400 italic">Aucune donnée</span>
                }
              </div>
            </div>

            {/* Ami(e)s depuis */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Ami(e)s depuis le</p>
              <div className="flex items-center gap-2 text-[13px] text-gray-700">
                <Users size={14} className="text-gray-400 flex-shrink-0" />
                {friendsSince
                  ? <span>{friendsSince.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  : <span className="text-gray-400 italic">Aucune donnée</span>
                }
              </div>
            </div>

            {/* Dernière connexion */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Dernière connexion</p>
              <div className="flex items-start gap-2 text-[13px]">
                <Clock size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
                {lastSeen
                  ? isOnlineNow
                    ? <span className="text-blue-500 font-medium">En ligne en ce moment</span>
                    : <span className="text-gray-700 leading-snug capitalize">{formatLastSeen(lastSeen)}</span>
                  : <span className="text-gray-400 italic">Aucune donnée</span>
                }
              </div>
            </div>

            {/* Ville */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Ville</p>
              <div className="flex items-center gap-2 text-[13px] text-gray-700">
                <MapPin size={14} className="text-gray-400 flex-shrink-0" />                  {canShowField('showCity') && contactFullData?.city
                    ? <span>{contactFullData.city}</span>
                    : <span className="text-gray-400 italic">Information masquée</span>
                  }
              </div>
            </div>
          </div>

          {/* ── Colonne droite : onglets ── */}
          <div className="flex-1 min-w-0">

            {/* Tabs */}
            <div className="flex mb-4 bg-white rounded-2xl px-2 shadow-sm overflow-hidden">
              {(['tableau', 'activite'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-3 text-[13px] font-medium transition-colors rounded-xl my-1 ${
                    tab === t
                      ? 'bg-gray-100 text-gray-900 font-semibold'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {t === 'tableau' ? 'Tableau' : 'Activité'}
                </button>
              ))}
            </div>

            {/* Tab : Tableau */}
            {tab === 'tableau' && (
              <div className="flex flex-col gap-3">

                {/* À propos */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <p className="text-[13px] font-semibold text-gray-700 mb-2">À propos</p>
                  {canShowField('showBio') && contactFullData?.bio
                    ? <p className="text-[13px] text-gray-600 leading-relaxed">{contactFullData.bio}</p>
                    : <p className="text-[13px] text-gray-400 italic">Information masquée.</p>
                  }
                </div>

                {/* Anniversaire */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <p className="text-[13px] font-semibold text-gray-700 mb-2">Anniversaire</p>
                  <div className="flex items-center gap-2 text-[13px] text-gray-600">
                    <CalendarBlank size={13} className="text-gray-400 flex-shrink-0" />
                    {canShowField('showBirthday') && contactFullData?.birthday
                      ? <span>{new Date(contactFullData.birthday).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span>
                      : <span className="text-gray-400 italic">Information masquée</span>
                    }
                  </div>
                </div>

                {/* Passions */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <p className="text-[13px] font-semibold text-gray-700 mb-2">Passions</p>
                  {canShowField('showPassions') && contactFullData?.passions ? (
                    <div className="flex flex-wrap gap-1.5">
                      {contactFullData.passions.split(',').map((p: string) => p.trim()).filter(Boolean).map((p: string, i: number) => (
                        <span key={i} className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-full text-[12px] text-gray-700">
                          <Heart size={10} className="text-gray-400" />
                          {p}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[13px] text-gray-400 italic flex items-center gap-1.5">
                      <Heart size={12} className="text-gray-300" /> Aucune donnée
                    </p>
                  )}
                </div>

                {/* Pronoms */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <p className="text-[13px] font-semibold text-gray-700 mb-2">Pronoms</p>
                  <div className="flex items-center gap-2 text-[13px] text-gray-600">
                    <Tag size={13} className="text-gray-400 flex-shrink-0" />
                    {canShowProfile && contactFullData?.pronouns
                      ? <span>{contactFullData.pronouns}</span>
                      : <span className="text-gray-400 italic">Information masquée</span>
                    }
                  </div>
                </div>
              </div>
            )}

            {/* Tab : Activité */}
            {tab === 'activite' && (
              <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center min-h-[120px] text-center">
                <p className="text-[13px] text-gray-400">Aucune activité récente.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
