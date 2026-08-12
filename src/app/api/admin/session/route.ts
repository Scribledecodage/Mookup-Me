import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/adminServer';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const session = await verifyAdminRequest(request);
  if (session.error || !session.user) {
    return NextResponse.json({ error: session.error || 'Session administrateur invalide.' }, { status: session.status || 401 });
  }

  return NextResponse.json({
    ok: true,
    uid: session.user.uid,
    email: session.user.email || null,
  });
}
