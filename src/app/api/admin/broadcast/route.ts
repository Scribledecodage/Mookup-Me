import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { getServerAdminFirestore, verifyAdminRequest } from '@/lib/adminServer';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const session = await verifyAdminRequest(request);
  if (session.error || !session.user) {
    return NextResponse.json({ error: session.error || 'Session administrateur invalide.' }, { status: session.status || 401 });
  }

  try {
    const body = await request.json() as { text?: unknown };
    const text = typeof body.text === 'string' ? body.text.trim() : '';

    if (!text) {
      return NextResponse.json({ error: 'Le message ne peut pas être vide.' }, { status: 400 });
    }
    if (text.length > 4000) {
      return NextResponse.json({ error: 'Le message ne peut pas dépasser 4 000 caractères.' }, { status: 400 });
    }

    const message = {
      text,
      uid: 'team-mookup',
      displayName: 'Team Mookup',
      photoURL: '/Logo.png',
      groupId: 'snapchat',
      createdAt: FieldValue.serverTimestamp(),
      readBy: { 'team-mookup': 'Team Mookup' },
      isAdminAnnouncement: true,
    };
    const messageReference = await getServerAdminFirestore().collection('messages').add(message);

    return NextResponse.json({ ok: true, messageId: messageReference.id });
  } catch (error) {
    console.error('Erreur publication annonce Team Mookup:', error);
    return NextResponse.json({ error: 'Impossible d’envoyer le message.' }, { status: 500 });
  }
}
