'use client';

import { useMemo, useRef, useState } from 'react';
import {
  Brain,
  CaretDown,
  CaretLeft,
  CaretRight,
  Check,
  CheckCircle,
  CircleNotch,
  ShieldCheck,
  UsersThree,
  X,
} from '@phosphor-icons/react';
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { recordBotShopEvent } from '@/lib/shopEvents';

export type BotInstallable = {
  id: string;
  name: string;
  description?: string;
  photoURL?: string;
  model?: string;
  prompt?: string;
  welcomeMessage?: string;
};

export type BotInstallGroup = {
  id: string;
  name: string;
  photoURL?: string;
  createdBy?: string;
  admins?: string[];
  members?: string[];
  installedBots?: { botId: string; name?: string; photoURL?: string }[];
};

export type BotInstallResult = {
  target: 'personal' | 'server';
  chatId?: string;
  groupId?: string;
};

interface BotInstallModalProps {
  bot: BotInstallable;
  user: { uid: string; displayName?: string | null };
  groups?: BotInstallGroup[];
  initialGroup?: BotInstallGroup | null;
  decisionId?: string;
  onClose: () => void;
  onInstalled?: (result: BotInstallResult) => void;
}

type InstallStep = 'choose' | 'server' | 'permissions' | 'success';

const DEFAULT_BOT_PHOTO = '/Logo.png';

type SuccessDetails = {
  target: 'personal' | 'server';
  chatId?: string;
  groupId?: string;
  groupName?: string;
};

export default function BotInstallModal({
  bot,
  user,
  groups = [],
  initialGroup = null,
  decisionId,
  onClose,
  onInstalled,
}: BotInstallModalProps) {
  const [step, setStep] = useState<InstallStep>('choose');
  const [target, setTarget] = useState<'personal' | 'server' | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroup?.id || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isGroupMenuOpen, setIsGroupMenuOpen] = useState(false);
  const [successDetails, setSuccessDetails] = useState<SuccessDetails | null>(null);
  const resultRef = useRef<BotInstallResult | null>(null);
  const botPhotoURL = bot.photoURL && bot.photoURL !== DEFAULT_BOT_PHOTO ? bot.photoURL : '';

  const availableGroups = useMemo(() => {
    const merged = [...groups, ...(initialGroup ? [initialGroup] : [])];
    const unique = new Map<string, BotInstallGroup>();
    merged.forEach(group => {
      if (group?.id) unique.set(group.id, group);
    });
    return [...unique.values()];
  }, [groups, initialGroup]);

  const manageableGroups = useMemo(
    () => availableGroups.filter(group => {
      const canManage = group.createdBy === user.uid || group.admins?.includes(user.uid);
      const alreadyInstalled = group.installedBots?.some(installedBot => installedBot.botId === bot.id);
      return canManage && !alreadyInstalled;
    }),
    [availableGroups, bot.id, user.uid]
  );
  const selectedGroup = manageableGroups.find(group => group.id === selectedGroupId) || null;
  const close = () => {
    if (isSaving) return;
    if (resultRef.current) onInstalled?.(resultRef.current);
    onClose();
  };

  const choosePersonal = () => {
    setTarget('personal');
    setStep('permissions');
  };

  const chooseServer = () => {
    setTarget('server');
    setStep('server');
  };

  const continueToPermissions = () => {
    if (!selectedGroup) return;
    setTarget('server');
    setStep('permissions');
  };

  const installBot = async () => {
    if (!target || isSaving || (target === 'server' && !selectedGroup)) return;
    setIsSaving(true);

    try {
      const baseInstall = {
        userId: user.uid,
        botId: bot.id,
        botName: bot.name,
        botPhotoURL,
        installedAt: serverTimestamp(),
      };

      if (target === 'personal') {
        const chatId = `botchat_${user.uid}_${bot.id}`;
        const arrivalMessage = `${bot.name} est arrivé(e).`;
        const welcomeMessage = bot.welcomeMessage?.trim();
        await setDoc(doc(db, 'private_chats', chatId), {
          participants: [user.uid],
          botId: bot.id,
          botName: bot.name,
          botPhotoURL,
          isBotChat: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessage: welcomeMessage || arrivalMessage,
          deletedBy: [],
        }, { merge: true });
        await setDoc(doc(db, 'bot_installations', `${user.uid}_${bot.id}_personal`), {
          ...baseInstall,
          scope: 'personal',
          chatId,
        }, { merge: true });
        await addDoc(collection(db, 'messages'), {
          text: arrivalMessage,
          uid: `bot-${bot.id}`,
          displayName: bot.name,
          photoURL: botPhotoURL,
          groupId: chatId,
          createdAt: serverTimestamp(),
          readBy: { [user.uid]: user.displayName || 'Utilisateur' },
          isSystemMessage: true,
        });
        if (welcomeMessage) {
          await addDoc(collection(db, 'messages'), {
            text: welcomeMessage,
            uid: `bot-${bot.id}`,
            displayName: bot.name,
            photoURL: botPhotoURL,
            groupId: chatId,
            createdAt: serverTimestamp(),
            readBy: { [user.uid]: user.displayName || 'Utilisateur' },
            isSystemMessage: true,
          });
        }

        const result = { target: 'personal' as const, chatId };
        resultRef.current = result;
        setSuccessDetails(result);
      } else if (selectedGroup) {
        const arrivalMessage = `${bot.name} est arrivé(e).`;
        const welcomeMessage = bot.welcomeMessage?.trim();
        await setDoc(doc(db, 'groups', selectedGroup.id), {
          installedBots: arrayUnion({
            botId: bot.id,
            name: bot.name,
            photoURL: botPhotoURL,
          }),
          updatedAt: serverTimestamp(),
          lastMessage: welcomeMessage || arrivalMessage,
        }, { merge: true });
        await setDoc(doc(db, 'bot_installations', `${user.uid}_${bot.id}_${selectedGroup.id}`), {
          ...baseInstall,
          scope: 'server',
          groupId: selectedGroup.id,
        }, { merge: true });
        await addDoc(collection(db, 'messages'), {
          text: arrivalMessage,
          uid: `bot-${bot.id}`,
          displayName: bot.name,
          photoURL: botPhotoURL,
          groupId: selectedGroup.id,
          createdAt: serverTimestamp(),
          readBy: { [user.uid]: user.displayName || 'Utilisateur' },
          isSystemMessage: true,
        });
        if (welcomeMessage) {
          await addDoc(collection(db, 'messages'), {
            text: welcomeMessage,
            uid: `bot-${bot.id}`,
            displayName: bot.name,
            photoURL: botPhotoURL,
            groupId: selectedGroup.id,
            createdAt: serverTimestamp(),
            readBy: { [user.uid]: user.displayName || 'Utilisateur' },
            isSystemMessage: true,
          });
        }

        const result = { target: 'server' as const, groupId: selectedGroup.id };
        resultRef.current = result;
        setSuccessDetails({ ...result, groupName: selectedGroup.name });
      }

      // Signal central borné au succès : le serveur déduplique l’installation,
      // met à jour les métriques et entraîne le modèle partagé.
      await recordBotShopEvent(bot.id, 'install', decisionId);
      setStep('success');
    } catch (error) {
      console.error('Erreur installation du bot:', error);
      window.alert('Impossible d’installer ce bot. Vérifie tes permissions puis réessaie.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderBotHeader = () => (
    <div className="flex flex-col items-center px-6 pb-5 pt-7 text-center">
      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 shadow-sm">
        {botPhotoURL ? <img src={botPhotoURL} alt={`Avatar ${bot.name}`} className="h-full w-full object-cover" /> : <Brain size={38} weight="duotone" className="text-gray-500" aria-hidden="true" />}
      </div>
      <h2 className="mt-4 text-[23px] font-bold text-gray-900">{bot.name}</h2>
      <p className="mt-2 max-w-md text-[15px] leading-6 text-gray-600">{bot.description || 'Cette application peut être utilisée dans tes discussions.'}</p>
    </div>
  );

  const renderPermissions = () => (
    <div className="mx-5 rounded-2xl border border-gray-200 bg-gray-50 p-5">
      <p className="text-[15px] font-medium text-gray-700">Ceci autorisera le développeur de {bot.name} à :</p>
      <div className="mt-4 space-y-4">
        {(target === 'server'
          ? ['Ajouter un bot à un serveur', 'Créer des commandes', 'Envoyer des messages dans ce serveur']
          : ['Créer des commandes', 'T’envoyer des messages privés', 'Répondre à tes messages']
        ).map(permission => (
          <div key={permission} className="flex items-center gap-3 text-[16px] text-gray-700">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-500 text-white"><Check size={15} weight="bold" /></span>
            <span>{permission}</span>
          </div>
        ))}
      </div>
      <div className="mt-6 border-t border-gray-200 pt-4 text-[12px] leading-5 text-gray-500">
        <div className="flex items-start gap-2"><ShieldCheck size={17} className="mt-0.5 flex-shrink-0" /><span>Cette application ne peut pas lire ou envoyer de messages à ta place.</span></div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/55 p-2 sm:p-4" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
      <div className="flex max-h-[96dvh] w-full max-w-[580px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          {step !== 'choose' && step !== 'success' ? (
            <button type="button" onClick={() => setStep(step === 'permissions' && target === 'server' ? 'server' : 'choose')} className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100" aria-label="Retour"><CaretLeft size={20} /></button>
          ) : <span className="h-9 w-9" />}
          <span className="text-[13px] font-semibold text-gray-500">{step === 'success' ? 'Installation terminée' : 'Autoriser une application'}</span>
          <button type="button" onClick={close} className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100" aria-label="Fermer"><X size={22} /></button>
        </div>

        {step === 'choose' && (
          <>
            {renderBotHeader()}
            <div className="mx-5 mb-6 overflow-hidden rounded-2xl border border-gray-200">
              <button type="button" onClick={choosePersonal} className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-gray-50">
                <UsersThree size={26} className="flex-shrink-0 text-gray-600" />
                <span className="min-w-0 flex-1"><span className="block text-[16px] font-medium text-gray-800">Ajoute à Mes applications</span><span className="mt-1 block text-[13px] text-gray-500">Utilise cette appli partout en message privé.</span></span>
                <CaretRight size={21} className="flex-shrink-0 text-gray-500" />
              </button>
              {manageableGroups.length > 0 && (
                <button type="button" onClick={chooseServer} className="flex w-full items-center gap-3 border-t border-gray-200 px-4 py-4 text-left transition-colors hover:bg-gray-50">
                  <ShieldCheck size={26} className="flex-shrink-0 text-gray-600" />
                  <span className="min-w-0 flex-1"><span className="block text-[16px] font-medium text-gray-800">Ajouter au serveur</span><span className="mt-1 block text-[13px] text-gray-500">Personnalise un serveur que tu peux gérer.</span></span>
                  <CaretRight size={21} className="flex-shrink-0 text-gray-500" />
                </button>
              )}
            </div>
          </>
        )}

        {step === 'server' && (
          <>
            {renderBotHeader()}
            <div className="mx-5 mb-5 rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <h3 className="text-[17px] font-semibold text-gray-800">Ajouter au serveur :</h3>
              {manageableGroups.length === 0 ? (
                <p className="mt-3 text-[14px] leading-5 text-gray-500">Tu ne possèdes aucun serveur où tu peux gérer les applications.</p>
              ) : (
                <div className="relative mt-3">
                  <button type="button" onClick={() => setIsGroupMenuOpen(value => !value)} className="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-4 py-3 text-left text-[15px] text-gray-800">
                    <span className="truncate">{selectedGroup?.name || 'Sélectionner un serveur'}</span>
                    <CaretDown size={18} className="flex-shrink-0 text-gray-500" />
                  </button>
                  {isGroupMenuOpen && (
                    <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-52 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-xl">
                      {manageableGroups.map(group => (
                        <button key={group.id} type="button" onClick={() => { setSelectedGroupId(group.id); setIsGroupMenuOpen(false); }} className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left text-[14px] hover:bg-gray-100 ${selectedGroupId === group.id ? 'bg-gray-100 font-medium' : ''}`}>
                          <span className="truncate">{group.name}</span>
                          {selectedGroupId === group.id && <Check size={17} className="ml-auto flex-shrink-0 text-indigo-600" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {selectedGroup && <p className="mt-3 text-[12px] text-gray-500">Tu dois avoir la permission <strong>Gérer le serveur</strong> sur ce serveur.</p>}
            </div>
            <div className="mt-auto flex gap-3 border-t border-gray-100 px-5 py-4"><button type="button" onClick={() => setStep('choose')} className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[15px] font-medium text-gray-700 hover:bg-gray-100">Retour</button><button type="button" onClick={continueToPermissions} disabled={!selectedGroup} className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-[15px] font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300">Continuer</button></div>
          </>
        )}

        {step === 'permissions' && (
          <>
            {renderBotHeader()}
            <div className="mb-5">{renderPermissions()}</div>
            <div className="mt-auto flex gap-3 border-t border-gray-100 px-5 py-4"><button type="button" onClick={() => setStep(target === 'server' ? 'server' : 'choose')} className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[15px] font-medium text-gray-700 hover:bg-gray-100">Retour</button><button type="button" onClick={() => void installBot()} disabled={isSaving || (target === 'server' && !selectedGroup)} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-[15px] font-semibold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:bg-indigo-300">{isSaving ? <CircleNotch size={18} className="animate-spin" /> : <ShieldCheck size={18} />}{isSaving ? 'Installation…' : 'Autoriser'}</button></div>
          </>
        )}

        {step === 'success' && successDetails && (
          <div className="flex flex-col items-center px-6 pb-7 pt-10 text-center">
            <CheckCircle size={92} weight="fill" className="text-emerald-500" />
            <h2 className="mt-5 text-[24px] font-bold text-gray-900">Bravo !</h2>
            <p className="mt-3 max-w-md text-[16px] leading-6 text-gray-600">L’application <strong>{bot.name}</strong> a été autorisée et {successDetails.target === 'personal' ? 'ajoutée à tes applications.' : <>ajoutée à <strong>{successDetails.groupName}</strong>.</>}</p>
            <button type="button" onClick={close} className="mt-8 w-full rounded-xl bg-indigo-600 px-4 py-3 text-[15px] font-semibold text-white hover:bg-indigo-700">{successDetails.target === 'personal' ? 'Ouvrir la discussion' : 'Fermer'}</button>
          </div>
        )}
      </div>
    </div>
  );
}
