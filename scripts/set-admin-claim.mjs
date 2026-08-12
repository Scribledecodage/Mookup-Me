import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const email = process.argv[2]?.trim();
const shouldRemove = process.argv.includes('--remove');

if (!email) {
  console.error('Usage: node scripts/set-admin-claim.mjs email@example.com [--remove]');
  process.exit(1);
}

try {
  const app = initializeApp({
    credential: applicationDefault(),
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'mookup-50b7e',
  });
  const adminAuth = getAuth(app);
  const user = await adminAuth.getUserByEmail(email);

  // Plusieurs comptes administrateurs peuvent être configurés.
  const claims = { ...(user.customClaims || {}) };

  if (shouldRemove) {
    delete claims.admin;
  } else {
    claims.admin = true;
  }

  await adminAuth.setCustomUserClaims(user.uid, claims);

  // Synchronise aussi le profil Firestore pour qu’il apparaisse dans la liste des membres.
  const firestore = getFirestore(app);
  await firestore.collection('users').doc(user.uid).set({
    uid: user.uid,
    email: user.email || email,
    displayName: user.displayName || email.split('@')[0],
    photoURL: user.photoURL || '',
    updatedAt: new Date(),
  }, { merge: true });

  console.log(shouldRemove
    ? `Droits admin retirés pour ${email}.`
    : `Droits admin accordés pour ${email}.`);
  console.log('L’utilisateur doit se reconnecter pour actualiser son token.');
} catch (error) {
  console.error('Impossible de modifier le rôle admin:', error.message);
  process.exit(1);
}
