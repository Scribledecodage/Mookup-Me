import { FieldValue } from 'firebase-admin/firestore';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { rankBots, isBotEligibleForBandit, type RankableBot, type RankedBot } from '@/lib/botRanking';
import { getServerAdminAuth, getServerAdminFirestore } from '@/lib/adminServer';

const MODEL_ID = 'shop-global-v1';
const MODEL_HORIZON_SECONDS = 7 * 24 * 60 * 60;

type GittinsApi = typeof import('gittins');
type GittinsState = ReturnType<GittinsApi['create']>;
type GittinsDecision = { decision_id?: string; chosen?: number };

async function loadGittins(): Promise<GittinsApi> {
  return import('gittins');
}

type PublicBot = RankableBot & Record<string, unknown>;
export type ShopRankingMode = 'complete' | 'simple';
type CentralRecommendations = {
  bots: RankedBot<PublicBot>[];
  mode: ShopRankingMode;
  banditChoiceId?: string;
  banditDecisionId?: string;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const recommendationsCache = new Map<string, { expiresAt: number; value: CentralRecommendations }>();
let publicBotsCache: { expiresAt: number; value: PublicBot[] } | null = null;
const installedBotsCache = new Map<string, { expiresAt: number; value: Set<string> }>();

export type ShopEventType = 'open' | 'install' | 'use' | 'feedback';

export type ShopUserVerification =
  | { user: DecodedIdToken; error?: never; status?: never }
  | { user?: never; error: string; status: 401 | 403 };

function getBearerToken(request: Request): string {
  const authorization = request.headers.get('authorization') || '';
  return authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length).trim() : '';
}

export async function verifyShopUser(request: Request): Promise<ShopUserVerification> {
  const token = getBearerToken(request);
  if (!token) return { error: 'Token de connexion manquant.', status: 401 };

  try {
    return { user: await getServerAdminAuth().verifyIdToken(token) };
  } catch (error) {
    console.error('Erreur vérification utilisateur Shop:', error);
    return { error: 'Session utilisateur invalide ou expirée.', status: 401 };
  }
}

function serializeValue(value: unknown): unknown {
  if (typeof value === 'object' && value !== null) {
    const timestamp = value as { toDate?: () => Date };
    if (typeof timestamp.toDate === 'function') {
      const date = timestamp.toDate();
      return date instanceof Date ? date.toISOString() : null;
    }
  }
  return value;
}

function serializableBot(bot: PublicBot): PublicBot {
  return {
    ...bot,
    createdAt: serializeValue(bot.createdAt),
    updatedAt: serializeValue(bot.updatedAt),
  };
}

function createBandit(api: GittinsApi): GittinsState {
  return api.create(8, MODEL_HORIZON_SECONDS, 0.25, 0.05, 0.1);
}

function restoreBandit(api: GittinsApi, value: unknown): GittinsState {
  if (typeof value !== 'string' || !value) return createBandit(api);
  try {
    return api.deserialize(value);
  } catch {
    return createBandit(api);
  }
}

async function loadPublicBots(): Promise<PublicBot[]> {
  if (publicBotsCache && publicBotsCache.expiresAt > Date.now()) return publicBotsCache.value;
  const firestore = getServerAdminFirestore();
  const snapshot = await firestore.collection('bots').where('isPublic', '==', true).get();
  const bots = snapshot.docs.map(document => ({
    id: document.id,
    ...(document.data() as Record<string, unknown>),
  })) as PublicBot[];

  const value = bots.map(bot => serializableBot({
    ...bot,
    // Les nouveaux bots enregistrent déjà le profil du créateur. On évite une
    // lecture users par bot : cela explosait la quota quand le Shop se rafraîchissait.
    creatorName: bot.creatorName || bot.createdByName || 'Créateur du bot',
    creatorPhotoURL: bot.creatorPhotoURL || bot.createdByPhotoURL || '',
  }));
  publicBotsCache = { expiresAt: Date.now() + CACHE_TTL_MS, value };
  return value;
}

async function loadInstalledBotIds(userId: string): Promise<Set<string>> {
  const cached = installedBotsCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const snapshot = await getServerAdminFirestore()
    .collection('bot_installations')
    .where('userId', '==', userId)
    .get();
  const value = new Set(snapshot.docs
    .map(document => document.data())
    .filter(data => data.scope === 'personal' && typeof data.botId === 'string')
    .map(data => data.botId as string));
  installedBotsCache.set(userId, { expiresAt: Date.now() + CACHE_TTL_MS, value });
  return value;
}

async function chooseBanditCandidate(userId: string, bots: PublicBot[]): Promise<{ botId?: string; decisionId?: string }> {
  const eligibleBots = bots.filter(isBotEligibleForBandit);
  if (eligibleBots.length === 0) return {};

  const firestore = getServerAdminFirestore();
  const gittins = await loadGittins();
  const modelReference = firestore.collection('shop_models').doc(MODEL_ID);
  const now = Date.now() / 1000;
  const maxInstalls = Math.max(1, ...eligibleBots.map(bot => typeof bot.installCount === 'number' ? Math.max(0, bot.installCount) : 0));
  const candidates: [string, { quality: number; popularity: number }][] = eligibleBots.map(bot => [bot.id, {
    quality: 1,
    popularity: Math.min(1, Math.log1p(typeof bot.installCount === 'number' ? Math.max(0, bot.installCount) : 0) / Math.log1p(maxInstalls)),
  }]);

  return firestore.runTransaction(async transaction => {
    const modelSnapshot = await transaction.get(modelReference);
    const state = restoreBandit(gittins, modelSnapshot.data()?.state);
    gittins.expire(state, now);
    const decision = gittins.decide(state, { shop: 1, authenticated: 1 }, candidates, now, 'shop-global') as GittinsDecision;
    const selectedBotId = typeof decision.chosen === 'number' ? candidates[decision.chosen]?.[0] : undefined;
    if (!selectedBotId || !decision.decision_id) return {};

    transaction.set(modelReference, {
      state: gittins.serialize(state),
      updatedAt: FieldValue.serverTimestamp(),
      model: 'gittins',
      version: 1,
    }, { merge: true });
    transaction.set(firestore.collection('shop_decisions').doc(decision.decision_id), {
      userId,
      botId: selectedBotId,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: now + MODEL_HORIZON_SECONDS,
      resolved: false,
    });
    return { botId: selectedBotId, decisionId: decision.decision_id };
  });
}

export async function getCentralShopRecommendations(userId: string): Promise<CentralRecommendations> {
  const cached = recommendationsCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const bots = await loadPublicBots();
  let installedBotIds = new Set<string>();
  try {
    installedBotIds = await loadInstalledBotIds(userId);
  } catch (error) {
    console.warn('[Shop] Installations indisponibles, classement sans personnalisation:', error);
  }

  let mode: ShopRankingMode = 'complete';
  let banditChoice: { botId?: string; decisionId?: string } = {};
  try {
    banditChoice = await chooseBanditCandidate(userId, bots);
  } catch (error) {
    mode = 'simple';
    console.warn('[Shop] Système simple actif : le classement Gittins central est indisponible.', error);
  }

  const value: CentralRecommendations = {
    bots: rankBots(bots, {
      userId,
      installedBotIds,
      banditChoiceId: banditChoice.botId,
    }),
    mode,
    banditChoiceId: banditChoice.botId,
    banditDecisionId: banditChoice.decisionId,
  };
  recommendationsCache.set(userId, { expiresAt: Date.now() + CACHE_TTL_MS, value });
  return value;
}

function rewardForEvent(type: ShopEventType): number {
  if (type === 'install') return 0.8;
  if (type === 'use') return 0.6;
  if (type === 'open') return 0.25;
  return 0.5;
}

function eventKey(userId: string, botId: string, type: ShopEventType): string {
  // An installation is a unique user/bot signal; open/use signals are sampled once per minute.
  return type === 'install'
    ? `${userId}_${botId}_install`
    : `${userId}_${botId}_${type}_${Math.floor(Date.now() / 60_000)}`;
}

function isSafeDecisionId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{8,160}$/.test(value);
}

export async function recordCentralShopEvent({
  userId,
  botId,
  type,
  decisionId,
}: {
  userId: string;
  botId: string;
  type: ShopEventType;
  decisionId?: string;
}): Promise<{ duplicate: boolean }> {
  const firestore = getServerAdminFirestore();
  const gittins = await loadGittins();
  const botReference = firestore.collection('bots').doc(botId);
  const eventReference = firestore.collection('shop_events').doc(eventKey(userId, botId, type));
  const modelReference = firestore.collection('shop_models').doc(MODEL_ID);
  const decisionReference = isSafeDecisionId(decisionId)
    ? firestore.collection('shop_decisions').doc(decisionId)
    : null;
  const now = Date.now() / 1000;

  return firestore.runTransaction(async transaction => {
    const botSnapshot = await transaction.get(botReference);
    const eventSnapshot = await transaction.get(eventReference);
    const modelSnapshot = await transaction.get(modelReference);
    const decisionSnapshot = decisionReference ? await transaction.get(decisionReference) : null;
    if (!botSnapshot.exists || botSnapshot.data()?.isPublic !== true) throw new Error('Bot public introuvable.');
    if (eventSnapshot.exists) return { duplicate: true };

    let learned = false;
    const decisionData = decisionSnapshot?.data();
    let nextModelState: string | null = null;
    if (decisionSnapshot?.exists && decisionData?.userId === userId && decisionData?.botId === botId && decisionData?.resolved !== true && typeof decisionId === 'string') {
      const state = restoreBandit(gittins, modelSnapshot.data()?.state);
      gittins.learn(state, decisionId, rewardForEvent(type), now);
      nextModelState = gittins.serialize(state);
      learned = true;
    }

    transaction.set(eventReference, {
      userId,
      botId,
      type,
      createdAt: FieldValue.serverTimestamp(),
    });
    const metrics: Record<string, FieldValue> = {};
    if (type === 'install') metrics.installCount = FieldValue.increment(1);
    if (type === 'open' || type === 'use') metrics.usageCount = FieldValue.increment(1);
    if (type === 'use') metrics.responseCount = FieldValue.increment(1);
    if (Object.keys(metrics).length > 0) transaction.update(botReference, metrics);
    if (learned && nextModelState) transaction.set(modelReference, {
      state: nextModelState,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    if (learned && decisionReference) transaction.update(decisionReference, {
      resolved: true,
      reward: rewardForEvent(type),
      resolvedAt: FieldValue.serverTimestamp(),
    });
    recommendationsCache.delete(userId);
    installedBotsCache.delete(userId);
    return { duplicate: false };
  });
}
