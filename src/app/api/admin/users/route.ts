import { NextResponse } from 'next/server';
import { getServerAdminAuth, getServerAdminFirestore, verifyAdminRequest } from '@/lib/adminServer';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const session = await verifyAdminRequest(request);
  if (session.error) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  try {
    const [authResult, profileSnapshot] = await Promise.all([
      getServerAdminAuth().listUsers(1000),
      getServerAdminFirestore().collection('users').get(),
    ]);
    const profiles = new Map(profileSnapshot.docs.map(profile => [profile.id, profile.data()]));

    const users = authResult.users.map(authUser => {
      const profile = profiles.get(authUser.uid) || {};
      return {
        uid: authUser.uid,
        email: authUser.email || profile.email || '',
        displayName: profile.displayName || profile.nickname || authUser.displayName || 'Utilisateur',
        photoURL: profile.photoURL || authUser.photoURL || '',
        emailVerified: authUser.emailVerified,
        disabled: authUser.disabled,
        createdAt: authUser.metadata.creationTime || profile.createdAt?.toDate?.()?.toISOString?.() || null,
        lastSignInAt: authUser.metadata.lastSignInTime || null,
      };
    }).sort((first, second) => first.displayName.localeCompare(second.displayName, 'fr'));

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Erreur chargement utilisateurs admin:', error);
    return NextResponse.json({ error: 'Impossible de charger les utilisateurs.' }, { status: 500 });
  }
}
