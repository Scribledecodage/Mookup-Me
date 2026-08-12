'use client';

import { useEffect, useState } from 'react';
import { Brain, CircleNotch, Plus, Robot, WarningCircle } from '@phosphor-icons/react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { rankBots, type RankableBot, type RankedBot } from '@/lib/botRanking';
import { buildMeshGradient, extractColors } from '@/lib/colorUtils';
import BotInstallModal, { type BotInstallGroup, type BotInstallable } from '@/components/bots/BotInstallModal';
import type { BotInstallResult } from '@/components/bots/BotInstallModal';
import { recordBotShopEvent } from '@/lib/shopEvents';

const DEFAULT_BOT_BANNER = '#e5e7eb';
const DEFAULT_BOT_PHOTO = '/Logo.png';

function getBotPhotoURL(photoURL?: string): string {
  return photoURL && photoURL !== DEFAULT_BOT_PHOTO ? photoURL : '';
}

type PublicBot = RankableBot & {
  slug?: string;
  bannerColor?: string;
  commands?: string;
  model?: string;
  welcomeMessage?: string;
  createdByName?: string;
  createdByPhotoURL?: string;
  creatorName?: string;
  creatorPhotoURL?: string;
  isPublic?: boolean;
};

type RecommendationsResponse = {
  bots?: RankedBot<PublicBot>[];
  mode?: 'complete' | 'simple';
  banditChoiceId?: string;
  banditDecisionId?: string;
  error?: string;
  details?: string;
};

function getDateLabel(value: unknown): string {
  if (value instanceof Date) return value.toLocaleDateString('fr-FR');
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('fr-FR');
  }
  if (!value || typeof value !== 'object') return '';
  const timestamp = value as { toDate?: () => Date };
  return typeof timestamp.toDate === 'function' ? timestamp.toDate().toLocaleDateString('fr-FR') : '';
}

function getCategoryLabel(category?: string): string {
  return category?.trim() && category !== 'Assistant' ? category : 'Productivité';
}

function BotCard({ rankedBot, isInstalled, onInstall, onOpenChat }: {
  rankedBot: RankedBot<PublicBot>;
  isInstalled: boolean;
  onInstall: (bot: BotInstallable) => void;
  onOpenChat: (bot: BotInstallable) => void;
}) {
  const { bot, rank } = rankedBot;
  const category = getCategoryLabel(bot.category);
  const command = bot.commands?.split(',')[0].trim();
  const createdDate = getDateLabel(bot.createdAt);
  const creatorName = bot.creatorName || bot.createdByName || 'Créateur du bot';
  const botPhotoURL = getBotPhotoURL(bot.photoURL);
  const [generatedBanner, setGeneratedBanner] = useState(DEFAULT_BOT_BANNER);

  useEffect(() => {
    if (!botPhotoURL || bot.bannerURL) return;
    let cancelled = false;
    void extractColors(botPhotoURL).then(colors => {
      if (!cancelled) setGeneratedBanner(buildMeshGradient(colors));
    });
    return () => {
      cancelled = true;
    };
  }, [bot.bannerColor, bot.bannerURL, botPhotoURL]);

  const bannerBackground = botPhotoURL && !bot.bannerURL ? generatedBanner : bot.bannerColor || DEFAULT_BOT_BANNER;

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="relative h-24" style={{ background: bannerBackground }}>
        {bot.bannerURL && <img src={bot.bannerURL} alt="" className="h-full w-full object-cover" />}
        <div className="absolute -bottom-5 left-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white shadow-sm">
          {botPhotoURL ? <img src={botPhotoURL} alt={`Avatar ${bot.name}`} className="h-full w-full object-cover" /> : <Brain size={34} weight="duotone" className="text-gray-500" aria-hidden="true" />}
        </div>
        <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-1 text-[16px] leading-none shadow-sm" aria-label={`Classement ${rank}`}>
          {rank === 1 ? '🏆' : `#${rank}`}
        </span>
      </div>
      <div className="p-4 pt-8">
        <h3 className="text-[16px] font-semibold text-gray-900">{bot.name}</h3>
        <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-gray-500">{bot.description || 'Aucune description fournie.'}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-900">
          <span className="rounded-md bg-gray-100 px-2 py-1 font-medium">{category}</span>
          {command && <span className="rounded-md bg-gray-100 px-2 py-1">{command}</span>}
          {createdDate && <span className="rounded-md bg-gray-100 px-2 py-1">Créé le {createdDate}</span>}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
          <div className="flex min-w-0 items-center"><span className="truncate text-[12px] font-medium text-gray-900">Par : {creatorName}</span></div>
          <button
            type="button"
            onClick={() => {
              const installableBot = {
                id: bot.id,
                name: bot.name,
                description: bot.description,
                photoURL: botPhotoURL,
                model: bot.model,
                prompt: bot.prompt,
                welcomeMessage: bot.welcomeMessage,
              };
              if (isInstalled) onOpenChat(installableBot);
              else onInstall(installableBot);
            }}
            className={`flex-shrink-0 rounded-md px-4 py-2 text-[12px] font-semibold text-white ${isInstalled ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            {isInstalled ? 'Ouvrir en MP' : 'Installer'}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function BotShopPage({
  onCreateBot,
  onOpenBotChat,
}: {
  onCreateBot?: () => void;
  onOpenBotChat?: (chatId: string, data: { name: string; avatar?: string }) => void;
}) {
  const [currentUser] = useAuthState(auth);
  const [rankedBots, setRankedBots] = useState<RankedBot<PublicBot>[]>([]);
  const [banditChoiceId, setBanditChoiceId] = useState<string | undefined>();
  const [banditDecisionId, setBanditDecisionId] = useState<string | undefined>();
  const [rankingMode, setRankingMode] = useState<'complete' | 'simple'>('complete');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [installingBot, setInstallingBot] = useState<BotInstallable | null>(null);
  const [groups, setGroups] = useState<BotInstallGroup[]>([]);
  const [installedBotIds, setInstalledBotIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!currentUser) return;
    const groupsQuery = query(collection(db, 'groups'), where('members', 'array-contains', currentUser.uid));
    return onSnapshot(groupsQuery, snapshot => {
      setGroups(snapshot.docs.map(groupDocument => ({ id: groupDocument.id, ...groupDocument.data() })) as BotInstallGroup[]);
    }, groupError => {
      console.warn('Groupes indisponibles pour l’installation des bots:', groupError);
      setGroups([]);
    });
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const installationsQuery = query(collection(db, 'bot_installations'), where('userId', '==', currentUser.uid));
    return onSnapshot(installationsQuery, snapshot => {
      setInstalledBotIds(new Set(snapshot.docs
        .map(document => document.data())
        .filter(data => data.scope === 'personal' && typeof data.botId === 'string')
        .map(data => data.botId as string)));
    }, installationError => {
      console.warn('Installations de bots indisponibles:', installationError);
      setInstalledBotIds(new Set());
    });
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    let retryBlockedUntil = 0;
    const loadSimpleRecommendations = async () => {
      const simpleSnapshot = await getDocs(query(collection(db, 'bots'), where('isPublic', '==', true)));
      const simpleBots = simpleSnapshot.docs.map(document => ({ id: document.id, ...document.data() })) as PublicBot[];
      if (cancelled) return;
      setRankedBots(rankBots(simpleBots, { userId: currentUser.uid }));
      setBanditChoiceId(undefined);
      setBanditDecisionId(undefined);
      setRankingMode('simple');
      setError('');
      setIsLoading(false);
      console.info('[Shop] Système simple actif : classement de secours utilisé.');
    };
    const loadRecommendations = async () => {
      if (Date.now() < retryBlockedUntil) {
        try {
          await loadSimpleRecommendations();
        } catch (fallbackError) {
          console.warn('[Shop] Classement simple indisponible pendant le quota Firebase:', fallbackError);
        }
        return;
      }
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch('/api/shop/recommendations', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const data = await response.json() as RecommendationsResponse;
        if (!response.ok || !Array.isArray(data.bots)) throw new Error(data.details || data.error || 'Réponse Shop invalide.');
        if (cancelled) return;
        setRankedBots(data.bots);
        setBanditChoiceId(data.banditChoiceId);
        setBanditDecisionId(data.banditDecisionId);
        setRankingMode(data.mode === 'simple' ? 'simple' : 'complete');
        console.info(data.mode === 'simple'
          ? '[Shop] Système simple actif : Gittins central indisponible.'
          : '[Shop] Système complet actif : classement central Gittins.');
        setError('');
        setIsLoading(false);
      } catch (loadError) {
        console.error('Erreur chargement recommandations centrales:', loadError);
        if (!cancelled) {
          const message = loadError instanceof Error ? loadError.message : '';
          const isQuotaError = /RESOURCE_EXHAUSTED|quota exceeded/i.test(message);
          if (isQuotaError) retryBlockedUntil = Date.now() + 15 * 60 * 1000;
          try {
            await loadSimpleRecommendations();
          } catch (fallbackError) {
            console.warn('[Shop] Système simple impossible à charger:', fallbackError);
            setError(isQuotaError ? 'Le quota Firebase est dépassé et le classement simple est aussi indisponible.' : message || 'Impossible de charger les recommandations du Shop.');
            setIsLoading(false);
          }
        }
      }
    };
    void loadRecommendations();
    const refreshTimer = window.setInterval(() => {
      if (!document.hidden) void loadRecommendations();
    }, 5 * 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, [currentUser]);

  const sendShopEvent = (botId: string, type: 'open', decisionId?: string) => {
    // L’apprentissage est centralisé immédiatement ; le nouveau classement
    // sera relu au prochain cycle pour éviter une requête Firestore par clic.
    void recordBotShopEvent(botId, type, decisionId);
  };
  const featuredBot = rankedBots[0]?.bot;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 pb-12">
      <div>
        <h2 className="mb-1 text-2xl font-semibold text-gray-900">Shop des bots</h2>
        <p className="text-[15px] text-gray-500">Découvre les vrais bots publics créés par la communauté.</p>
        <p className="mt-2 text-[12px] text-gray-400">Classement {rankingMode === 'complete' ? 'centralisé : qualité, satisfaction, fraîcheur, préférences et apprentissage collectif' : 'simple de secours : qualité, activité et fraîcheur'} . Aucun bot ne peut acheter sa place.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-gray-100 py-16 text-[13px] text-gray-500"><CircleNotch size={18} className="animate-spin" /> Chargement des bots…</div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-[13px] text-red-600"><WarningCircle size={18} /> {error}</div>
      ) : rankedBots.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 px-5 py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600"><Robot size={28} /></div>
          <h3 className="mt-4 text-[16px] font-semibold text-gray-900">Aucun bot public pour le moment</h3>
          <p className="mx-auto mt-1 max-w-md text-[13px] leading-5 text-gray-500">Les bots créés et publiés par la communauté apparaîtront ici, classés automatiquement.</p>
          {onCreateBot && <button type="button" onClick={onCreateBot} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-indigo-700"><Plus size={16} /> Créer le premier bot</button>}
        </div>
      ) : (
        <>
          {featuredBot && (
            <section className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 p-5 text-gray-900 shadow-sm sm:p-6">
              {featuredBot.bannerURL && <img src={featuredBot.bannerURL} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />}
              <div className="relative flex items-center gap-4">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm">{getBotPhotoURL(featuredBot.photoURL) ? <img src={getBotPhotoURL(featuredBot.photoURL)} alt={`Avatar ${featuredBot.name}`} className="h-full w-full object-cover" /> : <Brain size={30} weight="duotone" className="text-gray-500" aria-hidden="true" />}</div>
                <div className="min-w-0"><p className="text-[12px] font-semibold uppercase tracking-widest text-gray-500">Bot le mieux classé</p><h3 className="mt-1 truncate text-[18px] font-semibold">{featuredBot.name}</h3><p className="mt-1 line-clamp-2 text-[13px] text-gray-600">{featuredBot.description || 'Bot public de la communauté.'}</p></div>
              </div>
            </section>
          )}

          <section>
            <div className="mb-3 flex items-center justify-between"><div><h3 className="text-[16px] font-semibold text-gray-900">Bots recommandés</h3><p className="mt-1 text-[12px] text-gray-500">Décision calculée côté serveur à partir des signaux agrégés.</p></div><span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-500">{rankedBots.length} bot{rankedBots.length > 1 ? 's' : ''}</span></div>
            <div className="grid gap-4 sm:grid-cols-2">{rankedBots.map(rankedBot => {
              const bot = rankedBot.bot;
              const decisionId = bot.id === banditChoiceId ? banditDecisionId : undefined;
              return (
                <BotCard
                  key={bot.id}
                  rankedBot={rankedBot}
                  isInstalled={installedBotIds.has(bot.id)}
                  onInstall={setInstallingBot}
                  onOpenChat={() => {
                    sendShopEvent(bot.id, 'open', decisionId);
                    if (onOpenBotChat) onOpenBotChat(`botchat_${currentUser?.uid}_${bot.id}`, { name: bot.name, avatar: getBotPhotoURL(bot.photoURL) });
                  }}
                />
              );
            })}</div>
          </section>
        </>
      )}
      {installingBot && currentUser && (
        <BotInstallModal
          bot={installingBot}
          user={currentUser}
          groups={groups}
          decisionId={installingBot.id === banditChoiceId ? banditDecisionId : undefined}
          onClose={() => setInstallingBot(null)}
          onInstalled={(result: BotInstallResult) => {
            if (result.target === 'personal' && result.chatId && onOpenBotChat) onOpenBotChat(result.chatId, { name: installingBot.name, avatar: installingBot.photoURL });
          }}
        />
      )}
    </div>
  );
}
