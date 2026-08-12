import { NextResponse } from 'next/server';
import { recordCentralShopEvent, verifyShopUser, type ShopEventType } from '@/lib/shopServer';

export const runtime = 'nodejs';

const EVENT_TYPES: ShopEventType[] = ['open', 'install', 'use', 'feedback'];

export async function POST(request: Request) {
  const session = await verifyShopUser(request);
  if (session.error || !session.user) {
    return NextResponse.json({ error: session.error || 'Session utilisateur invalide.' }, { status: session.status || 401 });
  }

  try {
    const body = await request.json() as { botId?: unknown; type?: unknown; decisionId?: unknown };
    const botId = typeof body.botId === 'string' ? body.botId.trim() : '';
    const type = typeof body.type === 'string' && EVENT_TYPES.includes(body.type as ShopEventType)
      ? body.type as ShopEventType
      : null;
    const decisionId = typeof body.decisionId === 'string' ? body.decisionId : undefined;

    if (!botId || !type || botId.length > 200) {
      return NextResponse.json({ error: 'Événement Shop invalide.' }, { status: 400 });
    }

    const result = await recordCentralShopEvent({
      userId: session.user.uid,
      botId,
      type,
      decisionId,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('Erreur événement central du Shop:', error);
    return NextResponse.json({ error: 'Impossible d’enregistrer cet événement Shop.' }, { status: 500 });
  }
}
