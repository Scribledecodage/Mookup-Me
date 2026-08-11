'use client';

import React, { useEffect, useState } from 'react';
import {
  CaretLeft,
  CalendarBlank,
  ChatCircle,
  Clock,
  Heart,
  PencilSimple,
  PhoneCall,
  SealCheck,
  SignOut,
  Trash,
  UserMinus,
  UserPlus,
  Users,
  VideoCamera,
} from '@phosphor-icons/react';
import GroupAvatar from '../ui/GroupAvatar';
import UserAvatar from '../ui/UserAvatar';
import { buildMeshGradient, buildMeshGradientFromColor, extractColors } from '@/lib/colorUtils';
import { getUserColor } from '@/lib/getUserColor';
import { supabase } from '@/lib/supabase';

interface GroupMember {
  id: string;
  displayName?: string;
  nickname?: string;
  photoURL?: string;
}

type FirestoreDate = Date | string | number | { toDate: () => Date };

interface GroupData {
  createdAt?: FirestoreDate;
  createdBy?: string;
  admins?: string[];
  members?: string[];
}

function useOfficialGroupImage(localSource: string | null, storagePath: string | null): string | null {
  const [source, setSource] = useState(localSource);

  useEffect(() => {
    if (!localSource || !storagePath) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSource(localSource);
      return;
    }

    let cancelled = false;
    const bucket = supabase.storage.from('chat-files');
    const publicUrl = bucket.getPublicUrl(storagePath).data.publicUrl;

    const syncImage = async () => {
      const existing = await bucket.download(storagePath);
      if (!existing.error && existing.data) {
        if (!cancelled) setSource(publicUrl);
        return;
      }

      const response = await fetch(localSource);
      if (!response.ok) return;
      const image = await response.blob();
      const { error } = await bucket.upload(storagePath, image, {
        upsert: true,
        contentType: image.type || 'image/png',
      });

      if (!error && !cancelled) setSource(publicUrl);
    };

    syncImage().catch(() => {
      // L’image locale reste disponible si Supabase n’est pas accessible.
    });

    return () => {
      cancelled = true;
    };
  }, [localSource, storagePath]);

  return source;
}

interface GroupProfileProps {
  groupId: string | null;
  displayName: string;
  displayAvatar: string | null | undefined;
  isCustomGroup: boolean;
  customGroupData: GroupData | null;
  allGroupUsers: GroupMember[];
  currentUserId: string;
  onClose: () => void;
  onStartCall: (type: 'audio' | 'video') => void;
  onStartPrivateChat?: (user: { uid: string; displayName: string; photoURL?: string }) => void;
  onEditImage: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onEditName: () => void;
  onAddMembers: () => void;
  onLeaveGroup: () => void;
  onDeleteGroup: () => void;
  onRemoveMember: (event: React.MouseEvent, memberId: string, memberName: string) => void;
}

function useGroupBanner(source: string | null | undefined, groupId: string, fallbackColor?: string) {
  const fallbackBanner = buildMeshGradientFromColor(fallbackColor || getUserColor(groupId));
  const [banner, setBanner] = useState(() => fallbackBanner);

  useEffect(() => {
    if (!source) {
      // Le fond initial est déjà correct ; cette mise à jour suit uniquement un changement de groupe.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBanner(fallbackBanner);
      return;
    }

    let cancelled = false;
    extractColors(source).then(colors => {
      if (!cancelled) {
        setBanner(colors.length > 0
          ? buildMeshGradient(colors)
          : buildMeshGradientFromColor(fallbackColor || getUserColor(groupId)));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [source, groupId, fallbackBanner, fallbackColor]);

  return banner;
}

function formatDate(value: FirestoreDate | undefined): string | null {
  if (!value) return null;
  const date = typeof value === 'object' && 'toDate' in value ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function GroupProfile({
  groupId,
  displayName,
  displayAvatar,
  isCustomGroup,
  customGroupData,
  allGroupUsers,
  currentUserId,
  onClose,
  onStartCall,
  onStartPrivateChat,
  onEditImage,
  onEditName,
  onAddMembers,
  onLeaveGroup,
  onDeleteGroup,
  onRemoveMember,
}: GroupProfileProps) {
  const isBot = groupId?.startsWith('ai-') ?? false;
  const isTeam = groupId === 'snapchat';
  const isGeneral = groupId === 'general';
  const isOfficial = isBot || isTeam || isGeneral;
  const localOfficialImage = isBot ? '/BDDBOT.png' : isTeam ? '/Logo.png' : isGeneral ? '/group-general.svg' : null;
  const officialStoragePath = isBot
    ? 'group-images/official/bdd-bot.png'
    : isTeam
      ? 'group-images/official/team-mookup.png'
      : isGeneral
        ? 'group-images/official/group-general.svg'
        : null;
  const officialImage = useOfficialGroupImage(localOfficialImage, officialStoragePath);
  const avatarSource = displayAvatar || officialImage;
  const officialBannerColor = isBot ? '#6366f1' : isGeneral ? '#3b82f6' : undefined;
  // Les groupes officiels utilisent leur image Supabase pour personnaliser la bannière.
  const banner = useGroupBanner(avatarSource, groupId || displayName, officialBannerColor);
  const createdDate = formatDate(customGroupData?.createdAt);
  const memberCount = isBot || isTeam ? 1 : allGroupUsers.length;
  const isAdmin = isCustomGroup && (customGroupData?.createdBy === currentUserId || customGroupData?.admins?.includes(currentUserId));
  const [isOfficialBadgeOpen, setIsOfficialBadgeOpen] = useState(false);
  const officialBadgeInfo = isBot
    ? {
        title: 'BDD Bot officiel',
        description: 'Assistant officiel développé par l’équipe Mookup.',
      }
    : isTeam
      ? {
          title: 'Team Mookup officiel',
          description: 'Espace officiel des annonces et informations Mookup.',
        }
      : {
          title: 'Groupe général officiel',
          description: 'Espace commun officiel de la communauté Mookup.',
        };

  const description = isBot
    ? 'Un assistant officiel de Mookup pour vous aider dans vos échanges.'
    : isTeam
      ? 'Espace officiel réservé aux annonces et aux informations de Mookup.'
      : isGeneral
        ? 'Un espace commun pour échanger avec les membres de Mookup.'
        : 'Un espace privé créé par ses membres pour discuter ensemble.';

  const groupType = isBot
    ? 'Assistant officiel'
    : isTeam || isGeneral
      ? 'Groupe officiel Mookup'
      : 'Groupe créé par un utilisateur';

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#f2f3f5]">
      <div className="flex-1 overflow-y-auto">
        <section className="relative">
          <div className="h-[150px] w-full" style={{ background: banner }} />
          <button
            onClick={onClose}
            className="absolute top-3 left-3 z-20 rounded-full bg-white/80 p-2 text-gray-600 shadow backdrop-blur-sm transition hover:bg-white"
            aria-label="Retour à la discussion"
          >
            <CaretLeft size={20} />
          </button>

          <div className="-mt-10 flex items-end justify-between px-5 pb-4">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-[#f2f3f5] bg-gray-200 shadow-md">
                {isBot ? (
                  <div className="flex h-full w-full items-center justify-center bg-[#6366f1]">
                    <img src={avatarSource || '/BDDBOT.png'} alt="BDD Bot" className="h-full w-full object-contain p-1.5" />
                  </div>
                ) : isGeneral ? (
                  <GroupAvatar size={80} />
                ) : avatarSource ? (
                  <img src={avatarSource} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <GroupAvatar size={80} />
                )}
              </div>
              <div className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-[#f2f3f5] bg-blue-500" />
              {isCustomGroup && isAdmin && (
                <label className="absolute -bottom-2 -right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-[#5865f2] text-white shadow">
                  <PencilSimple size={15} />
                  <input type="file" accept="image/*" className="hidden" onChange={onEditImage} />
                </label>
              )}
            </div>

            <div className="mb-1 flex gap-2">
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 rounded-lg bg-[#5865f2] px-3 py-1.5 text-[13px] font-medium text-white transition hover:bg-[#4752c4]"
              >
                <ChatCircle size={14} />
                Message
              </button>
              {!isOfficial && (
                <>
                  <button onClick={() => onStartCall('audio')} className="rounded-lg bg-white p-2 shadow-sm transition hover:bg-gray-100" title="Appel vocal">
                    <PhoneCall size={16} className="text-gray-600" />
                  </button>
                  <button onClick={() => onStartCall('video')} className="rounded-lg bg-white p-2 shadow-sm transition hover:bg-gray-100" title="Appel vidéo">
                    <VideoCamera size={16} className="text-gray-600" />
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-4 px-4 pb-8 md:flex-row md:items-start">
          <div className="flex flex-col gap-3 md:w-[250px] md:flex-shrink-0">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h1 className="break-words text-[20px] font-bold leading-tight text-gray-900">{displayName}</h1>
                  <p className="mt-1 text-[12px] text-gray-400">{groupType}</p>
                </div>
                {isOfficial && (
                  <div
                    className="relative flex-shrink-0"
                    onMouseEnter={() => setIsOfficialBadgeOpen(true)}
                    onMouseLeave={() => setIsOfficialBadgeOpen(false)}
                  >
                    <button
                      type="button"
                      onClick={() => setIsOfficialBadgeOpen(open => !open)}
                      onFocus={() => setIsOfficialBadgeOpen(true)}
                      aria-label="Informations sur le badge officiel"
                      aria-expanded={isOfficialBadgeOpen}
                      className="rounded-full p-0.5 text-[#00a884] transition hover:bg-[#00a884]/10"
                    >
                      <SealCheck size={19} />
                    </button>
                    {isOfficialBadgeOpen && (
                      <div
                        role="tooltip"
                        className="absolute bottom-full left-1/2 z-30 mb-2 w-64 -translate-x-1/2 rounded-xl border border-gray-100 bg-white p-3 text-left shadow-[0_8px_24px_rgba(0,0,0,0.14)]"
                      >
                        <p className="text-[13px] font-semibold text-gray-900">{officialBadgeInfo.title}</p>
                        <p className="mt-1 text-[12px] leading-relaxed text-gray-500">{officialBadgeInfo.description}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {isCustomGroup && isAdmin && (
                <button onClick={onEditName} className="mt-3 flex items-center gap-1.5 text-[12px] font-medium text-gray-500 hover:text-[#00a884]">
                  <PencilSimple size={14} /> Modifier le nom
                </button>
              )}
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Membres</p>
              <div className="flex items-center gap-2 text-[13px] text-gray-700">
                <Users size={15} className="flex-shrink-0 text-gray-400" />
                <span>{memberCount} membre{memberCount > 1 ? 's' : ''}</span>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Date de création</p>
              <div className="flex items-start gap-2 text-[13px] text-gray-700">
                <CalendarBlank size={15} className="mt-0.5 flex-shrink-0 text-gray-400" />
                {createdDate ? <span>{createdDate}</span> : <span className="text-gray-400 italic">Groupe officiel Mookup</span>}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Activité</p>
              <div className="flex items-start gap-2 text-[13px] text-gray-700">
                <Clock size={15} className="mt-0.5 flex-shrink-0 text-gray-400" />
                <span>{isTeam ? 'Annonces officielles de Mookup' : 'Discussion de groupe'}</span>
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="mb-2 text-[13px] font-semibold text-gray-700">À propos</p>
              <p className="text-[13px] leading-relaxed text-gray-600">{description}</p>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[13px] font-semibold text-gray-700">Membres du groupe</p>
                {isCustomGroup && isAdmin && (
                  <button onClick={onAddMembers} className="flex items-center gap-1.5 text-[12px] font-medium text-[#5865f2] hover:text-[#4752c4]">
                    <UserPlus size={15} /> Ajouter
                  </button>
                )}
              </div>
              {isBot ? (
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-2">
                  <img src={avatarSource || '/BDDBOT.png'} alt="BDD Bot" className="h-10 w-10 rounded-full bg-[#6366f1] object-contain p-1.5" />
                  <div>
                    <p className="text-[14px] font-medium text-gray-800">BDD Bot</p>
                    <p className="text-[12px] text-gray-400">Assistant officiel</p>
                  </div>
                </div>
              ) : isTeam ? (
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-2">
                  <img src="/Logo.png" alt="Team Mookup" className="h-10 w-10 rounded-full object-cover" />
                  <div>
                    <p className="text-[14px] font-medium text-gray-800">Team Mookup</p>
                    <p className="text-[12px] text-gray-400">Groupe officiel Mookup</p>
                  </div>
                </div>
              ) : allGroupUsers.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {allGroupUsers.map(member => {
                    const name = member.displayName || member.nickname || 'Utilisateur';
                    return (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-gray-50"
                        onClick={() => {
                          if (member.id !== currentUserId && onStartPrivateChat) {
                            onStartPrivateChat({ uid: member.id, displayName: name, photoURL: member.photoURL });
                            onClose();
                          }
                        }}
                      >
                        <UserAvatar uid={member.id} photoURL={member.photoURL || null} displayName={name} size={40} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-medium text-gray-800">{name}</p>
                          {customGroupData?.createdBy === member.id && <p className="text-[11px] font-semibold text-[#5865f2]">Créateur du groupe</p>}
                        </div>
                        {isCustomGroup && isAdmin && member.id !== currentUserId && customGroupData?.createdBy !== member.id && (
                          <button onClick={event => onRemoveMember(event, member.id, name)} className="rounded-full p-2 text-red-500 hover:bg-red-50" title="Retirer du groupe">
                            <UserMinus size={17} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[13px] italic text-gray-400">Aucun membre disponible.</p>
              )}
            </div>

            {isCustomGroup && (
              <div className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm">
                <button onClick={onLeaveGroup} className="flex items-center gap-2 rounded-xl p-2 text-left text-[13px] font-medium text-red-500 transition hover:bg-red-50">
                  <SignOut size={18} /> Quitter le groupe
                </button>
                {customGroupData?.createdBy === currentUserId && (
                  <button onClick={onDeleteGroup} className="flex items-center gap-2 rounded-xl p-2 text-left text-[13px] font-medium text-red-600 transition hover:bg-red-50">
                    <Trash size={18} /> Supprimer le groupe
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 rounded-2xl bg-white p-4 text-[12px] text-gray-400 shadow-sm">
              <Heart size={14} className="flex-shrink-0 text-gray-300" />
              Cette présentation concerne les informations du groupe.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
