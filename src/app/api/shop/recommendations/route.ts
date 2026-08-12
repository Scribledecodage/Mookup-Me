import { NextResponse } from 'next/server';
import { getCentralShopRecommendations, verifyShopUser } from '@/lib/shopServer';

export const runtime = 'nodejs';

type SerializableBot = Record<string, unknown>;

export async function GET(request: Request) {
  try {
    const session = await verifyShopUser(request);
    if (session.error || !session.user) {
      return NextResponse.json({ error: session.error || 'Session utilisateur invalide.' }, { status: session.status || 401 });
    }

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
    // Le classement local du client sait déjà prendre le relais si Firebase Admin,
    // Gittins ou le modèle central sont indisponibles. On renvoie donc une réponse
    // JSON exploitable plutôt qu’une page HTML 500 que le client ne peut pas parser.
    return NextResponse.json({
      error: 'Recommandations centrales indisponibles.',
      fallback: true,
      mode: 'simple',
      bots: [],
      ...(process.env.NODE_ENV !== 'production' && error instanceof Error ? { details: error.message } : {}),
    }, {
      status: 200,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }
}
