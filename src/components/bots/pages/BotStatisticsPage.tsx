'use client';

import { useEffect, useState } from 'react';
import { Brain, CircleNotch, SquaresFour } from '@phosphor-icons/react';
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';

type SavedBot = {
  id: string;
  name: string;
  photoURL?: string;
};

type BotStats = {
  botId: string;
  name: string;
  photoURL: string;
  groupCount: number;
  privateConversationCount: number;
  responseCount: number;
};

export default function BotStatisticsPage({ onCreateBot }: { onCreateBot?: () => void }) {
  const [user, authLoading] = useAuthState(auth);
  const [stats, setStats] = useState<BotStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      // Auth externe : réinitialiser l’état après le changement de session.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStats([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    const botsQuery = query(collection(db, 'bots'), where('createdBy', '==', user.uid));

    const unsubscribe = onSnapshot(botsQuery, snapshot => {
      const ownedBots = snapshot.docs.map(document => ({ id: document.id, ...document.data() })) as SavedBot[];
      if (ownedBots.length === 0) {
        setStats([]);
        setIsLoading(false);
        return;
      }

      const loadStats = async () => {
        try {
          const botStats = await Promise.all(ownedBots.map(async bot => {
            const messages = await getDocs(query(collection(db, 'messages'), where('uid', '==', `bot-${bot.id}`)));
            const groups = new Set<string>();
            const privateConversations = new Set<string>();

            messages.forEach(message => {
              const groupId = message.data().groupId;
              if (typeof groupId !== 'string') return;
              if (groupId.startsWith('private_')) privateConversations.add(groupId);
              else groups.add(groupId);
            });

            return {
              botId: bot.id,
              name: bot.name,
              photoURL: bot.photoURL && bot.photoURL !== '/Logo.png' ? bot.photoURL : '',
              groupCount: groups.size,
              privateConversationCount: privateConversations.size,
              responseCount: messages.size,
            };
          }));

          if (!cancelled) {
            setStats(botStats.sort((first, second) => first.name.localeCompare(second.name, 'fr')));
            setError('');
            setIsLoading(false);
          }
        } catch (statsError) {
          console.error('Erreur chargement statistiques bots:', statsError);
          if (!cancelled) {
            setError('Impossible de charger les statistiques des bots.');
            setIsLoading(false);
          }
        }
      };

      void loadStats();
    }, snapshotError => {
      console.error('Erreur chargement bots statistiques:', snapshotError);
      if (!cancelled) {
        setError('Impossible de charger les statistiques des bots.');
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [user, authLoading]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 pb-12">
      <div><h2 className="mb-1 text-2xl font-semibold text-gray-900">Statistiques</h2><p className="text-[15px] text-gray-500">Des chiffres réels sur l’utilisation de tes bots, sans afficher les noms des groupes ni le contenu des messages privés.</p></div>
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-gray-100 py-12 text-[13px] text-gray-500"><CircleNotch size={18} className="animate-spin" /> Chargement des statistiques…</div>
      ) : error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-600">{error}</p>
      ) : stats.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 px-5 py-12 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600"><SquaresFour size={26} /></div><h3 className="mt-4 text-[16px] font-semibold text-gray-900">Aucun bot créé</h3><p className="mx-auto mt-1 max-w-md text-[13px] leading-5 text-gray-500">Crée ton premier bot pour voir son nombre de groupes actifs, ses conversations privées et ses réponses.</p><button type="button" onClick={onCreateBot} className="mt-5 rounded-xl bg-indigo-600 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-indigo-700">Créer un bot</button></div>
      ) : (
        <div className="space-y-4">
          {stats.map(bot => (
            <article key={bot.botId} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-gray-100 p-4"><div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-gray-100">{bot.photoURL ? <img src={bot.photoURL} alt="" className="h-full w-full object-cover" /> : <Brain size={26} weight="duotone" className="text-gray-500" aria-hidden="true" />}</div><div><h3 className="text-[15px] font-semibold text-gray-900">{bot.name}</h3><p className="text-[12px] text-gray-500">Statistiques d’utilisation</p></div></div>
              <div className="grid grid-cols-3 divide-x divide-gray-100"><div className="p-4 text-center"><p className="text-2xl font-semibold text-gray-900">{bot.groupCount}</p><p className="mt-1 text-[11px] text-gray-500">Groupes actifs</p></div><div className="p-4 text-center"><p className="text-2xl font-semibold text-gray-900">{bot.privateConversationCount}</p><p className="mt-1 text-[11px] text-gray-500">Conversations privées</p></div><div className="p-4 text-center"><p className="text-2xl font-semibold text-gray-900">{bot.responseCount}</p><p className="mt-1 text-[11px] text-gray-500">Réponses envoyées</p></div></div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
