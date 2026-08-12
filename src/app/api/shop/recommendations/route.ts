import { NextResponse } from 'next/server';
import { getCentralShopRecommendations, verifyShopUser } from '@/lib/shopServer';

export const runtime = 'nodejs';

type SerializableBot = Record<string, unknown>;

export async function GET(request: Request) {
  const session = await verifyShopUser(request);
  if (session.error || !session.user) {
    return NextResponse.json({ error: session.error || 'Session utilisateur invalide.' }, { status: session.status || 401 });
  }

  try {
    const recommendations = await getCentralShopRecommendations(session.user.uid);
    return NextResponse.json({
      ...recommendations,
      bots: recommendations.bots.map(entry => ({
        ...entry,
        bot: entry.bot as SerializableBot,
      })),
    }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Erreur recommandations centrales du Shop:', error);
    return NextResponse.json({
      error: 'Impossible de calculer les recommandations du Shop.',
      ...(process.env.NODE_ENV !== 'production' && error instanceof Error ? { details: error.message } : {}),
    }, { status: 500 });
  }
}
