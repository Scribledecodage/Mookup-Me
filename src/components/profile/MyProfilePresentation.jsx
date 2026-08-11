'use client';

import { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { onSnapshot, doc } from 'firebase/firestore';
import { CaretLeft, CalendarBlank, Clock, Heart, MapPin, Tag, UserCircle } from '@phosphor-icons/react';
import { auth, db } from '@/lib/firebase';
import UserAvatar from '@/components/ui/UserAvatar';
import { buildMeshGradientFromColor } from '@/lib/colorUtils';
import { getUserColor } from '@/lib/getUserColor';

function toDate(value) {
  if (!value) return null;
  const date = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value, options) {
  const date = toDate(value);
  return date ? date.toLocaleDateString('fr-FR', options) : null;
}

export default function MyProfilePresentation({ onClose }) {
  const [user] = useAuthState(auth);
  const [profile, setProfile] = useState({});

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, 'users', user.uid), snapshot => {
      setProfile(snapshot.exists() ? snapshot.data() : {});
    });
  }, [user]);

  if (!user) return null;

  const displayName = profile.displayName || profile.nickname || user.displayName || user.email?.split('@')[0] || 'Utilisateur';
  const photoURL = profile.photoURL || user.photoURL || null;
  const banner = buildMeshGradientFromColor(getUserColor(user.uid));
  const statusExpiresAt = toDate(profile.statusExpiresAt);
  const hasStatus = Boolean(profile.statusText && statusExpiresAt && statusExpiresAt > new Date());
  const statusText = hasStatus ? profile.statusText : '';
  const statusEmoji = hasStatus ? profile.statusEmoji || '' : '';
  const isShortStatus = statusText.length <= 28;
  const passions = typeof profile.passions === 'string'
    ? profile.passions.split(',').map(item => item.trim()).filter(Boolean)
    : Array.isArray(profile.passions) ? profile.passions : [];
  const createdAt = formatDate(profile.createdAt || user.metadata?.creationTime, { day: 'numeric', month: 'long', year: 'numeric' });
  const birthday = formatDate(profile.birthday, { day: 'numeric', month: 'long' });

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f2f3f5]">
      <div className="flex-1 overflow-y-auto">
        <section className="relative">
          <div className="h-[155px] w-full" style={{ background: banner }} />
          <button
            type="button"
            onClick={onClose}
            className="absolute left-3 top-3 z-20 rounded-full bg-white/85 p-2 text-gray-600 shadow backdrop-blur-sm transition hover:bg-white"
            aria-label="Retour aux informations du compte"
          >
            <CaretLeft size={20} />
          </button>

          <div className="-mt-11 flex items-end px-5 pb-5">
            <div className="relative flex-shrink-0">
              <div className="flex h-[88px] w-[88px] items-center justify-center overflow-hidden rounded-full border-4 border-[#f2f3f5] bg-gray-100 shadow-md">
                {photoURL ? (
                  <img src={photoURL} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <UserAvatar uid={user.uid} photoURL={null} displayName={displayName} size={88} />
                )}
              </div>
              <div className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-[#f2f3f5] bg-blue-500" />

              {hasStatus && (
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
            <div className="ml-auto mb-1 flex items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 text-[12px] font-medium text-gray-600 shadow-sm backdrop-blur-sm">
              <UserCircle size={15} className="text-blue-500" /> Profil public
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-4 px-4 pb-8 md:flex-row md:items-start">
          <div className="flex flex-col gap-3 md:w-[250px] md:flex-shrink-0">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <h1 className="break-words text-[20px] font-bold leading-tight text-gray-900">{displayName}</h1>
              {profile.pronouns && <p className="mt-1 text-[12px] text-gray-400">{profile.pronouns}</p>}
              <div className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-blue-500">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                En ligne
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Membre depuis</p>
              <div className="flex items-center gap-2 text-[13px] text-gray-700">
                <CalendarBlank size={15} className="flex-shrink-0 text-gray-400" />
                <span>{createdAt || 'Aucune donnée'}</span>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Dernière activité</p>
              <div className="flex items-center gap-2 text-[13px] text-blue-500">
                <Clock size={15} className="flex-shrink-0" />
                <span>En ligne en ce moment</span>
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="mb-2 text-[13px] font-semibold text-gray-700">À propos</p>
              <p className={profile.bio ? 'text-[13px] leading-relaxed text-gray-600' : 'text-[13px] italic text-gray-400'}>
                {profile.bio || 'Aucune description pour le moment.'}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="mb-2 text-[13px] font-semibold text-gray-700">Anniversaire</p>
              <div className="flex items-center gap-2 text-[13px] text-gray-600">
                <CalendarBlank size={14} className="flex-shrink-0 text-gray-400" />
                <span className={birthday ? '' : 'italic text-gray-400'}>{birthday || 'Aucune donnée'}</span>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="mb-2 text-[13px] font-semibold text-gray-700">Passions</p>
              {passions.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {passions.map((passion, index) => (
                    <span key={`${passion}-${index}`} className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[12px] text-gray-700">
                      <Heart size={10} className="text-gray-400" />
                      {passion}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] italic text-gray-400">Aucune passion renseignée.</p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="mb-2 text-[13px] font-semibold text-gray-700">Ville</p>
                <div className="flex items-center gap-2 text-[13px] text-gray-600">
                  <MapPin size={14} className="flex-shrink-0 text-gray-400" />
                  <span className={profile.city ? '' : 'italic text-gray-400'}>{profile.city || 'Aucune donnée'}</span>
                </div>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="mb-2 text-[13px] font-semibold text-gray-700">Pronoms</p>
                <div className="flex items-center gap-2 text-[13px] text-gray-600">
                  <Tag size={14} className="flex-shrink-0 text-gray-400" />
                  <span className={profile.pronouns ? '' : 'italic text-gray-400'}>{profile.pronouns || 'Aucune donnée'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
