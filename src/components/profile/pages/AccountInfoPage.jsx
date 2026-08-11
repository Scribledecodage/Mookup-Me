'use client';

import { useEffect, useRef, useState } from 'react';
import { EmailAuthProvider, linkWithCredential, updateProfile } from 'firebase/auth';
import { collection, doc, getDocs, onSnapshot, query, setDoc, where, writeBatch } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { ArrowUpRight, CheckCircle, CircleNotch, PencilSimple, UserCircle } from '@phosphor-icons/react';
import { auth, db } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';
import UserAvatar from '@/components/ui/UserAvatar';

const inputCls = 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-[15px] transition-colors';
const inputCenterCls = `${inputCls} text-center text-[16px]`;
const labelCls = 'text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1 block mb-1';

export default function AccountInfoPage() {
  const [user] = useAuthState(auth);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const profileInputRef = useRef(null);
  const isLinkingAccount = user?.isAnonymous || false;

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) setCurrentUserData(docSnap.data());
    });
  }, [user]);

  useEffect(() => {
    const handleChangeProfilePhoto = () => profileInputRef.current?.click();
    window.addEventListener('change_profile_photo', handleChangeProfilePhoto);
    return () => window.removeEventListener('change_profile_photo', handleChangeProfilePhoto);
  }, []);

  useEffect(() => {
    if (currentUserData) {
      // Les données Firestore synchronisent le formulaire avec le compte courant.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNickname(currentUserData.displayName || currentUserData.nickname || user?.displayName || '');
    } else if (user) {
      setNickname(user.displayName || '');
    }
  }, [user, currentUserData]);

  const hasChanges = isLinkingAccount
    ? nickname !== (user?.displayName || '') || email.trim() !== '' || password.trim() !== ''
    : nickname !== (user?.displayName || '');
  const displayPhotoURL = currentUserData?.photoURL || user?.photoURL;
  const displayDisplayName = currentUserData?.displayName || currentUserData?.nickname || user?.displayName || 'Utilisateur';

  const handleProfileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    try {
      setIsUploadingProfile(true);
      const fileExt = file.name.split('.').pop();
      const filePath = `avatars/${user.uid}-${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('avatars').upload(filePath, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      await updateProfile(user, { photoURL: urlData.publicUrl });
      await setDoc(doc(db, 'users', user.uid), { photoURL: urlData.publicUrl, updatedAt: new Date() }, { merge: true });
    } catch (error) {
      console.error('Erreur upload profil:', error?.message || error);
      alert('Erreur lors de la mise à jour de la photo');
    } finally {
      setIsUploadingProfile(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!nickname.trim() || !user) return;
    setAuthError('');
    setIsSuccess(false);
    setIsSaving(true);
    try {
      await updateProfile(user, { displayName: nickname });
      await setDoc(doc(db, 'users', user.uid), { nickname, displayName: nickname, updatedAt: new Date() }, { merge: true });
      try {
        const snapshot = await getDocs(query(collection(db, 'messages'), where('uid', '==', user.uid)));
        const batches = [];
        let batch = writeBatch(db);
        let count = 0;
        snapshot.forEach((message) => {
          batch.update(message.ref, { displayName: nickname });
          count += 1;
          if (count === 500) {
            batches.push(batch.commit());
            batch = writeBatch(db);
            count = 0;
          }
        });
        if (count > 0) batches.push(batch.commit());
        await Promise.all(batches);
      } catch (error) {
        console.error('Erreur lors de la mise à jour des anciens messages:', error);
      }
      if (isLinkingAccount && email && password) {
        try {
          await linkWithCredential(user, EmailAuthProvider.credential(email, password));
          await setDoc(doc(db, 'users', user.uid), { email, isPermanent: true }, { merge: true });
        } catch (error) {
          if (error?.code === 'auth/email-already-in-use') {
            setAuthError('Cet email est déjà utilisé par un autre compte.');
            return;
          }
          throw error;
        }
      }
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 2000);
    } catch (error) {
      console.error('Erreur mise à jour profil:', error);
      setAuthError(error?.message || 'Une erreur est survenue.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 pb-12 w-full max-w-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">Compte</h2>
        <p className="text-gray-500 text-[15px]">
          {isLinkingAccount ? 'Ajoutez un email pour ne jamais perdre vos messages.' : 'Mettez à jour votre profil.'}
        </p>
      </div>
      <div className="text-center mb-6 flex flex-col items-center">
        <input type="file" accept="image/*" className="hidden" ref={profileInputRef} onChange={handleProfileUpload} />
        <button type="button" className="relative cursor-pointer group mb-4 block" onClick={() => profileInputRef.current?.click()} title="Changer la photo de profil">
          <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 shadow-sm overflow-hidden group-hover:bg-gray-200 transition-all">
            {isUploadingProfile ? <CircleNotch size={32} className="animate-spin text-blue-500" /> : displayPhotoURL ? <img src={displayPhotoURL} alt="Profile" className="w-full h-full object-cover" /> : <UserAvatar uid={user?.uid || ''} photoURL={null} displayName={displayDisplayName} size={96} />}
          </div>
          <div className="absolute bottom-0 right-0 w-8 h-8 bg-blue-500 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-white"><PencilSimple size={16} /></div>
        </button>
        <h3 className="text-xl font-bold text-gray-800">{isLinkingAccount ? 'Sécurisez votre compte' : 'Vos informations'}</h3>
        {!isLinkingAccount && (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('view_my_profile'))}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-[13px] font-semibold text-blue-600 transition-colors hover:bg-blue-100"
          >
            <UserCircle size={17} />
            Voir mon profil public
            <ArrowUpRight size={15} />
          </button>
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 w-full">
        <div>
          <label className={labelCls}>Prénom / Pseudo</label>
          <input type="text" placeholder="Votre prénom" value={nickname} onChange={(event) => setNickname(event.target.value)} className={inputCenterCls} required />
        </div>
        {isLinkingAccount && <>
          <div><label className={labelCls}>Email</label><input type="email" placeholder="votre@email.com" value={email} onChange={(event) => setEmail(event.target.value)} className={inputCls} required /></div>
          <div><label className={labelCls}>Mot de passe</label><input type="password" placeholder="••••••••" value={password} onChange={(event) => setPassword(event.target.value)} className={inputCls} required /></div>
        </>}
        {authError && <p className="text-xs text-red-500 text-center">{authError}</p>}
        <button type="submit" disabled={isSaving || (!hasChanges && !isSuccess)} className={`w-full py-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${isSuccess ? 'bg-blue-500 text-white' : isSaving || !hasChanges ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>
          {isSaving ? <CircleNotch size={20} className="animate-spin" /> : isSuccess ? <><CheckCircle size={20} /> Enregistré</> : 'Enregistrer'}
        </button>
        {!isLinkingAccount && user?.email && <div className="pt-6"><label className={labelCls}>Email (Non modifiable)</label><input type="text" value={user.email} disabled className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg outline-none text-center text-[16px] text-gray-500 cursor-not-allowed" /></div>}
      </form>
    </div>
  );
}
