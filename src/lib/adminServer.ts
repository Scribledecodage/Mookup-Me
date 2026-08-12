import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { isAdminEmail } from '@/lib/adminConfig';

function getAdminApp() {
  const existingApp = getApps()[0];
  if (existingApp) return existingApp;

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'mookup-50b7e';
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  let credential;
  if (clientEmail && privateKey) {
    credential = cert({ projectId, clientEmail, privateKey });
  } else {
    // En local, le compte de service ignoré par Git est détecté automatiquement.
    // Sur Vercel, les variables FIREBASE_ADMIN_* restent la source utilisée.
    const configuredPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const localServerDirectory = resolve(process.cwd(), 'server');
    const canUseLocalCredentials = process.env.VERCEL !== '1';
    const detectedServiceAccount = canUseLocalCredentials && existsSync(localServerDirectory)
      ? readdirSync(localServerDirectory).find(fileName => /-firebase-adminsdk-.*\.json$/i.test(fileName))
      : undefined;
    const localServiceAccount = canUseLocalCredentials
      ? configuredPath
        ? (existsSync(configuredPath) ? configuredPath : resolve(process.cwd(), configuredPath))
        : detectedServiceAccount ? resolve(localServerDirectory, detectedServiceAccount) : undefined
      : undefined;

    if (localServiceAccount && existsSync(localServiceAccount)) {
      credential = cert(JSON.parse(readFileSync(localServiceAccount, 'utf8')));
    } else {
      credential = applicationDefault();
    }
  }

  return initializeApp({ credential, projectId });
}

export function getServerAdminAuth() {
  return getAuth(getAdminApp());
}

export function getServerAdminFirestore() {
  return getFirestore(getAdminApp());
}

export async function verifyAdminRequest(request: Request): Promise<
  | { user: DecodedIdToken; error?: never }
  | { user?: never; error: string; status: 401 | 403 }
> {
  const authorization = request.headers.get('authorization');
  const idToken = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : '';

  if (!idToken) {
    return { error: 'Token de connexion manquant.', status: 401 };
  }

  try {
    const decodedToken = await getServerAdminAuth().verifyIdToken(idToken);
    const email = decodedToken.email?.toLowerCase() || '';
    if (decodedToken.admin !== true && !isAdminEmail(email)) {
      return { error: 'Ce compte n’a pas les droits administrateur.', status: 403 };
    }

    return { user: decodedToken };
  } catch (error) {
    console.error('Erreur vérification session admin:', error);
    return { error: 'Session administrateur invalide ou service non configuré.', status: 401 };
  }
}
