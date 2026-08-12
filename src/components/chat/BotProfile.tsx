'use client';

import { useEffect, useState } from 'react';
import { Brain, CalendarBlank, CaretLeft, ChatCircle, Code, ShieldWarning, Tag, UserCircle } from '@phosphor-icons/react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import UserAvatar from '@/components/ui/UserAvatar';
import { buildMeshGradient, extractColors } from '@/lib/colorUtils';

type BotDate = Date | string | number | { toDate?: () => Date } | null | undefined;

const DEFAULT_BOT_PHOTO = '/Logo.png';

export interface BotProfileData {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  photoURL?: string;
  bannerURL?: string;
  bannerColor?: string;
  category?: string;
  model?: string;
  commands?: string;
  welcomeMessage?: string;
  createdBy?: string;
  createdByName?: string;
  createdByPhotoURL?: string;
  createdAt?: BotDate;
}

interface BotProfileProps {
  bot: BotProfileData;
  onClose: () => void;
}

function toDate(value: BotDate): Date | null {
  if (!value) return null;
  const date = typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function'
    ? value.toDate()
    : new Date(value as string | number | Date);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: BotDate): string | null {
  const date = toDate(value);
  return date ? date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
}

export default function BotProfile({ bot, onClose }: BotProfileProps) {
  const [creator, setCreator] = useState({
    name: bot.createdByName || 'Utilisateur',
    photoURL: bot.createdByPhotoURL || '',
  });
  const [isBadgeOpen, setIsBadgeOpen] = useState(false);
  const [generatedBanner, setGeneratedBanner] = useState('linear-gradient(135deg, #d1d5db, #9ca3af)');
  const createdDate = formatDate(bot.createdAt);
  const botPhotoURL = bot.photoURL && bot.photoURL !== DEFAULT_BOT_PHOTO ? bot.photoURL : '';
  const bannerStyle = bot.bannerURL
    ? { backgroundImage: `url(${bot.bannerURL})`, backgroundPosition: 'center', backgroundSize: 'cover' }
    : { background: botPhotoURL ? generatedBanner : 'linear-gradient(135deg, #d1d5db, #9ca3af)' };

  useEffect(() => {
    if (!botPhotoURL || bot.bannerURL) return;
    let cancelled = false;
    extractColors(botPhotoURL).then(colors => {
      if (!cancelled) setGeneratedBanner(buildMeshGradient(colors));
    });
    return () => {
      cancelled = true;
    };
  }, [botPhotoURL, bot.bannerURL]);

  useEffect(() => {
    if (!bot.createdBy || (bot.createdByName && bot.createdByPhotoURL)) return;
    let cancelled = false;
    getDoc(doc(db, 'users', bot.createdBy)).then(snapshot => {
      if (cancelled || !snapshot.exists()) return;
      const data = snapshot.data();
      setCreator({
        name: bot.createdByName || data.displayName || data.nickname || 'Utilisateur',
        photoURL: bot.createdByPhotoURL || data.photoURL || '',
      });
    }).catch(() => {
      // Les informations enregistrées avec le bot restent affichées si le profil est inaccessible.
    });
    return () => {
      cancelled = true;
    };
  }, [bot.createdBy, bot.createdByName, bot.createdByPhotoURL]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f2f3f5]">
      <div className="flex-1 overflow-y-auto">
        <section className="relative">
          <div className="h-[155px] w-full" style={bannerStyle} />
          <button
            type="button"
            onClick={onClose}
            className="absolute left-3 top-3 z-20 rounded-full bg-white/85 p-2 text-gray-600 shadow backdrop-blur-sm transition hover:bg-white"
            aria-label="Retour à la discussion"
          >
            <CaretLeft size={20} />
          </button>

          <div className="-mt-11 flex items-end justify-between px-5 pb-5">
            <div className="relative flex-shrink-0">
              <div className="flex h-[88px] w-[88px] items-center justify-center overflow-hidden rounded-full border-4 border-[#f2f3f5] bg-gray-100 shadow-md">
                {botPhotoURL ? (
                  <img src={botPhotoURL} alt={bot.name} className="h-full w-full object-cover" />
                ) : (
                  <Brain size={42} weight="duotone" className="text-gray-500" aria-hidden="true" />
                )}
              </div>
              <div className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-[#f2f3f5] bg-blue-500" />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mb-1 flex items-center gap-1.5 rounded-lg bg-[#5865f2] px-3 py-1.5 text-[13px] font-medium text-white transition hover:bg-[#4752c4]"
            >
              <ChatCircle size={14} /> Message
            </button>
          </div>
        </section>

        <div className="flex flex-col gap-4 px-4 pb-8 md:flex-row md:items-start">
          <div className="flex flex-col gap-3 md:w-[250px] md:flex-shrink-0">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <h1 className="break-words text-[20px] font-bold leading-tight text-gray-900">{bot.name}</h1>
                  <p className="mt-1 text-[12px] text-gray-400">Bot communautaire</p>
                </div>
                <div
                  className="relative flex-shrink-0"
                  onMouseEnter={() => setIsBadgeOpen(true)}
                  onMouseLeave={() => setIsBadgeOpen(false)}
                >
                  <button
                    type="button"
                    onClick={() => setIsBadgeOpen(open => !open)}
                    onFocus={() => setIsBadgeOpen(true)}
                    className="rounded-full p-1 text-gray-500 transition hover:bg-gray-100 hover:text-indigo-600"
                    aria-label="Informations sur le statut non officiel de ce bot"
                    aria-expanded={isBadgeOpen}
                  >
                    <ShieldWarning size={19} />
                  </button>
                  {isBadgeOpen && (
                    <div role="tooltip" className="absolute bottom-full left-0 z-30 mb-2 w-64 rounded-xl border border-gray-100 bg-white p-3 text-left shadow-[0_8px_24px_rgba(0,0,0,0.14)]">
                      <p className="text-[13px] font-semibold text-gray-900">Bot communautaire</p>
                      <p className="mt-1 text-[12px] leading-relaxed text-gray-500">Ce bot a été créé par {creator.name}. Il est indépendant de l’équipe officielle de Mookup.</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[12px] font-medium text-blue-500">
                <span className="h-2 w-2 rounded-full bg-blue-500" /> Disponible en message privé
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Codé par</p>
              <div className="flex items-center gap-3">
                <UserAvatar uid={bot.createdBy || bot.id} photoURL={creator.photoURL || null} displayName={creator.name} size={38} />
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-gray-800">{creator.name}</p>
                  <p className="text-[12px] text-gray-500">Créateur utilisateur</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Identité</p>
              <div className="flex items-center gap-2 text-[13px] text-gray-700">
                <Tag size={15} className="flex-shrink-0 text-gray-400" />
                <span>{bot.category && bot.category !== 'Assistant' ? bot.category : 'Productivité'}</span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-[13px] text-gray-700">
                <Code size={15} className="flex-shrink-0 text-gray-400" />
                <span className="truncate">/{bot.slug || bot.name.toLowerCase().replace(/\s+/g, '')}</span>
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <UserCircle size={17} className="text-indigo-500" />
                <p className="text-[13px] font-semibold text-gray-700">À propos de ce bot</p>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-gray-600">{bot.description || 'Aucune description pour le moment.'}</p>
              <p className="mt-3 rounded-xl bg-indigo-50 px-3 py-2 text-[12px] leading-relaxed text-indigo-800">Application créée par la communauté Mookup, indépendante de l’équipe officielle.</p>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="mb-3 text-[13px] font-semibold text-gray-700">Informations de l’application</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-gray-50 p-3">
                  <div className="flex items-center gap-2 text-[12px] font-semibold text-gray-500"><Brain size={15} /> Modèle</div>
                  <p className="mt-1 text-[13px] text-gray-800">{bot.model || 'Mistral Large'}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <div className="flex items-center gap-2 text-[12px] font-semibold text-gray-500"><CalendarBlank size={15} /> Créé le</div>
                  <p className="mt-1 text-[13px] text-gray-800">{createdDate || 'Aucune donnée'}</p>
                </div>
              </div>
              {bot.commands && (
                <div className="mt-3 rounded-xl bg-gray-50 p-3">
                  <p className="text-[12px] font-semibold text-gray-500">Commandes disponibles</p>
                  <p className="mt-1 break-words text-[13px] text-gray-800">{bot.commands}</p>
                </div>
              )}
            </div>

            {bot.welcomeMessage && (
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="mb-2 text-[13px] font-semibold text-gray-700">Message d’accueil</p>
                <p className="text-[13px] leading-relaxed text-gray-600">{bot.welcomeMessage}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
