export interface RankableBot {
  id: string;
  name: string;
  description?: string;
  prompt?: string;
  category?: string;
  photoURL?: string;
  bannerURL?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy?: string;
  installCount?: number;
  usageCount?: number;
  responseCount?: number;
  rating?: number;
  ratingCount?: number;
}

export interface RankingOptions {
  /** Stable user-specific seed: it rotates exploration without jumping on every render. */
  userId?: string;
  /** Bots already installed by this user are kept visible but are not over-promoted. */
  installedBotIds?: ReadonlySet<string>;
  /** Optional server-provided feedback learned from this user's actions, from -1 to 1. */
  feedback?: Readonly<Record<string, number>>;
  now?: number;
  rotation?: number;
  /** A safe candidate chosen by the contextual bandit for controlled exploration. */
  banditChoiceId?: string;
}

export interface RankedBot<T extends RankableBot = RankableBot> {
  bot: T;
  score: number;
  rank: number;
}

/** Only complete enough bots enter the learning policy; incomplete drafts stay discoverable lower down. */
export function isBotEligibleForBandit(bot: RankableBot): boolean {
  const hasDescription = typeof bot.description === 'string' && bot.description.trim().length >= 12;
  const hasPresentation = Boolean(
    (typeof bot.photoURL === 'string' && bot.photoURL.trim() && bot.photoURL !== '/Logo.png')
      || (typeof bot.bannerURL === 'string' && bot.bannerURL.trim())
  );
  return hasDescription && hasPresentation;
}

const DAY = 86_400_000;

function toTimestamp(value: unknown): number | null {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === 'object' && value !== null) {
    const timestamp = value as { toMillis?: () => number; toDate?: () => Date };
    if (typeof timestamp.toMillis === 'function') return timestamp.toMillis();
    if (typeof timestamp.toDate === 'function') {
      const date = timestamp.toDate();
      return date instanceof Date ? date.getTime() : null;
    }
  }
  return null;
}

function positiveNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function hash(value: string): number {
  let result = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16_777_619);
  }
  return (result >>> 0) / 4_294_967_295;
}

function profileQuality(bot: RankableBot): number {
  const name = typeof bot.name === 'string' ? bot.name.trim() : '';
  const description = typeof bot.description === 'string' ? bot.description.trim() : '';
  const prompt = typeof bot.prompt === 'string' ? bot.prompt.trim() : '';
  const category = typeof bot.category === 'string' && bot.category.trim() ? 1 : 0;
  const hasPhoto = typeof bot.photoURL === 'string' && bot.photoURL.trim() && bot.photoURL !== '/Logo.png';
  const hasBanner = typeof bot.bannerURL === 'string' && bot.bannerURL.trim();
  const descriptionQuality = description.length >= 80 ? 1 : description.length >= 35 ? 0.85 : description.length >= 12 ? 0.45 : 0;
  const promptQuality = prompt.length >= 80 ? 1 : prompt.length >= 20 ? 0.7 : 0;
  const presentation = hasPhoto || hasBanner ? 1 : 0;

  // La longueur brute ne donne aucun avantage : seule une fiche réellement
  // exploitable compte, avec une description et une présentation vérifiables.
  return clamp((Boolean(name) ? 0.15 : 0) + descriptionQuality * 0.35 + promptQuality * 0.2 + category * 0.15 + presentation * 0.15);
}

function missingQualityPenalty(bot: RankableBot): number {
  const description = typeof bot.description === 'string' && bot.description.trim().length >= 12;
  const presentation = Boolean(
    (typeof bot.photoURL === 'string' && bot.photoURL.trim() && bot.photoURL !== '/Logo.png')
      || (typeof bot.bannerURL === 'string' && bot.bannerURL.trim())
  );
  // La découverte ne doit jamais faire passer une fiche vide devant une fiche prête.
  return (description ? 0 : 0.35) + (presentation ? 0 : 0.2);
}

function activity(bot: RankableBot): number {
  return positiveNumber(bot.installCount) + positiveNumber(bot.usageCount) + positiveNumber(bot.responseCount);
}

function confidence(bot: RankableBot): number {
  // A new bot receives more discovery opportunities; popularity alone cannot lock the ranking.
  return clamp(Math.log1p(activity(bot)) / Math.log1p(30));
}

function satisfaction(bot: RankableBot): number {
  const ratingCount = positiveNumber(bot.ratingCount);
  if (ratingCount === 0 || typeof bot.rating !== 'number' || !Number.isFinite(bot.rating)) return 0.5;

  // Bayesian smoothing prevents one perfect rating from beating a bot with real history.
  const priorCount = 8;
  const smoothedRating = (clamp(bot.rating / 5) * ratingCount + 0.76 * priorCount) / (ratingCount + priorCount);
  return clamp(smoothedRating);
}

function freshness(bot: RankableBot, now: number): number {
  const timestamp = toTimestamp(bot.updatedAt) ?? toTimestamp(bot.createdAt);
  if (timestamp === null) return 0.35;
  const ageInDays = Math.max(0, (now - timestamp) / DAY);
  return Math.exp(-ageInDays / 180);
}

function categoryAffinity<T extends RankableBot>(bot: T, bots: T[], installedBotIds: ReadonlySet<string>): number {
  if (installedBotIds.size === 0 || !bot.category) return 0.5;
  const categoryScores = new Map<string, number>();
  bots.forEach(candidate => {
    if (installedBotIds.has(candidate.id) && candidate.category) {
      categoryScores.set(candidate.category, (categoryScores.get(candidate.category) || 0) + 1);
    }
  });
  const total = [...categoryScores.values()].reduce((sum, value) => sum + value, 0);
  return total > 0 ? clamp((categoryScores.get(bot.category) || 0) / total * 1.5) : 0.5;
}

/**
 * Classe les bots publics sans laisser la popularité historique enfermer le Shop.
 *
 * Les facteurs sont volontairement lisibles : qualité de la fiche, satisfaction
 * lissée, activité logarithmique, fraîcheur, affinité de catégorie et découverte.
 * La découverte est stable pour un utilisateur pendant une rotation hebdomadaire,
 * ce qui donne aux nouveaux bots une exposition réelle sans hasard permanent.
 */
export function rankBots<T extends RankableBot>(bots: T[], options: RankingOptions = {}): RankedBot<T>[] {
  const now = options.now ?? Date.now();
  const rotation = options.rotation ?? Math.floor(now / (7 * DAY));
  const installedBotIds = options.installedBotIds ?? new Set<string>();
  const feedback = options.feedback ?? {};
  const maxActivity = Math.max(0, ...bots.map(activity));
  const maxRatingCount = Math.max(0, ...bots.map(bot => positiveNumber(bot.ratingCount)));
  const seed = options.userId || 'anonymous';

  const scored = bots.map(bot => {
    const activityScore = maxActivity > 0
      ? Math.log1p(activity(bot)) / Math.log1p(maxActivity)
      : 0;
    const popularityScore = activityScore * 0.65 + (maxActivity > 0 ? Math.log1p(positiveNumber(bot.installCount)) / Math.log1p(maxActivity) * 0.35 : 0);
    const ratingConfidence = maxRatingCount > 0
      ? clamp(positiveNumber(bot.ratingCount) / maxRatingCount)
      : 0;
    const satisfactionScore = satisfaction(bot) * (0.35 + ratingConfidence * 0.65);
    const feedbackScore = clamp(((feedback[bot.id] ?? 0) + 1) / 2);
    const coldStart = 1 - confidence(bot);
    const stableExploration = 0.55 + hash(`${seed}:${rotation}:${bot.id}`) * 0.45;
    const qualityScore = profileQuality(bot);
    // L’exploration reste active pour les nouveaux bots, mais elle est
    // proportionnelle à la qualité afin de ne pas promouvoir les fiches vides.
    const explorationScore = coldStart * stableExploration * (0.25 + qualityScore * 0.75);
    const affinityScore = categoryAffinity(bot, bots, installedBotIds);
    const installedPenalty = installedBotIds.has(bot.id) ? 0.08 : 0;

    const score = qualityScore * 0.38
      + satisfactionScore * 0.12
      + popularityScore * 0.18
      + freshness(bot, now) * 0.1
      + explorationScore * 0.08
      + affinityScore * 0.08
      + feedbackScore * 0.04
      + (options.banditChoiceId === bot.id ? 0.06 : 0)
      - missingQualityPenalty(bot)
      - installedPenalty;

    return { bot, score };
  });

  scored.sort((first, second) => {
    if (second.score !== first.score) return second.score - first.score;
    const firstTieBreak = hash(`${seed}:${rotation}:${first.bot.id}`);
    const secondTieBreak = hash(`${seed}:${rotation}:${second.bot.id}`);
    if (secondTieBreak !== firstTieBreak) return secondTieBreak - firstTieBreak;
    return first.bot.name.localeCompare(second.bot.name, 'fr');
  });

  // Anti-monopole : un créateur ne peut occuper que deux des six premières places.
  // Les bots suivants restent classés normalement, sans supprimer de contenu.
  const topWindow = Math.min(6, scored.length);
  const creatorCounts = new Map<string, number>();
  const diversified: typeof scored = [];
  const remaining = [...scored];
  for (let position = 0; position < scored.length; position += 1) {
    const candidateIndex = position < topWindow
      ? remaining.findIndex(entry => {
          const creator = entry.bot.createdBy || entry.bot.id;
          return (creatorCounts.get(creator) || 0) < 2;
        })
      : 0;
    const [candidate] = remaining.splice(candidateIndex < 0 ? 0 : candidateIndex, 1);
    const creator = candidate.bot.createdBy || candidate.bot.id;
    creatorCounts.set(creator, (creatorCounts.get(creator) || 0) + 1);
    diversified.push(candidate);
  }

  return diversified.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

