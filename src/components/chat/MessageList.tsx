'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CircleNotch } from '@phosphor-icons/react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getUserColor } from '@/lib/getUserColor';
import MessageItem from './MessageItem';
import { Message } from './types';

// Map uid -> photoURL en direct depuis Firestore
type ProfileMap = Record<string, string>;

interface MessageListProps {
  messages: Message[];
  user: any;
  isLoadingMore: boolean;
  hasMore: boolean;
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  prevScrollHeightRef: React.RefObject<number>;
  onStartPrivateChat?: (user: { uid: string, displayName: string, photoURL?: string }) => void;
  onReply?: (message: Message) => void;
  groupId: string | null;
  typingUsers: any[];
}

export default function MessageList({
  messages,
  user,
  isLoadingMore,
  hasMore,
  handleScroll,
  scrollRef,
  prevScrollHeightRef,
  onStartPrivateChat,
  onReply,
  groupId,
  typingUsers
}: MessageListProps) {
  const [profileMap, setProfileMap] = useState<ProfileMap>({});
  const fetchedUids = useRef<Set<string>>(new Set());
  const prevGroupIdRef = useRef<string | null>(null);
  const lastMessageIdRef = useRef<string | undefined>(undefined);
  // true quand on vient de changer de conv et qu'on attend les nouveaux messages pour scroller
  const pendingScrollRef = useRef(false);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  };

  // Quand groupId change, on marque qu'un scroll en bas est en attente
  useEffect(() => {
    if (prevGroupIdRef.current !== groupId) {
      prevGroupIdRef.current = groupId;
      pendingScrollRef.current = true;
      lastMessageIdRef.current = undefined;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  // Scroll vers le bas quand les messages changent
  useEffect(() => {
    if (messages.length === 0) return;
    const lastId = messages[messages.length - 1]?.id;

    // Si on chargeait des messages anciens (load more), restaure la position sans saut
    if (prevScrollHeightRef.current > 0) {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight - prevScrollHeightRef.current;
      prevScrollHeightRef.current = 0;
      lastMessageIdRef.current = lastId;
      return;
    }

    // Changement de conversation : scroll instantané dès que les nouveaux messages sont là
    if (pendingScrollRef.current) {
      pendingScrollRef.current = false;
      lastMessageIdRef.current = lastId;
      // requestAnimationFrame pour laisser le DOM se mettre à jour
      requestAnimationFrame(() => scrollToBottom('instant'));
      return;
    }

    // Nouveau message dans la conversation courante
    if (lastId === lastMessageIdRef.current) return;
    lastMessageIdRef.current = lastId;

    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 150) {
      scrollToBottom('smooth');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);  // Récupère les photos de profil en direct pour tous les UIDs uniques des messages
  useEffect(() => {
    const uidsInMessages = [...new Set(
      messages
        .map(m => m.uid)
        .filter(uid => uid && uid !== 'bddbot' && uid !== 'mistral-ai' && !uid.startsWith('ai-'))
    )];
    const missing = uidsInMessages.filter(uid => !fetchedUids.current.has(uid));
    if (missing.length === 0) return;

    missing.forEach(uid => fetchedUids.current.add(uid));

    // Firestore in-query limite à 30 items — on chunk si nécessaire
    const chunks: string[][] = [];
    for (let i = 0; i < missing.length; i += 30) {
      chunks.push(missing.slice(i, i + 30));
    }

    Promise.all(
      chunks.map(chunk =>
        getDocs(query(collection(db, 'users'), where('uid', 'in', chunk)))
      )
    ).then(snapshots => {
      const updates: ProfileMap = {};
      snapshots.forEach(snap => {
        snap.forEach(doc => {
          const data = doc.data();
          if (data.uid && data.photoURL !== undefined) {
            updates[data.uid] = data.photoURL || '';
          }
        });
      });
      if (Object.keys(updates).length > 0) {
        setProfileMap(prev => ({ ...prev, ...updates }));
      }
    }).catch(() => { /* silencieux si offline */ });
  }, [messages]);

  const formatMessageDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return `Aujourd'hui à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Hier à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div 
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 min-w-0 max-w-full overflow-x-hidden overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent px-2 py-4 bg-white"
    >
      <div className="flex flex-col min-h-full">
        {/* Load More Trigger */}
        {hasMore && (
          <div className="flex justify-center py-4">
            {isLoadingMore ? (
              <CircleNotch className="w-6 h-6 animate-spin text-blue-500" />
            ) : (
              <span className="text-xs text-gray-400 font-medium">Faites défiler pour voir les messages plus anciens</span>
            )}
          </div>
        )}

        {/* Message groups or direct list */}
        <div className="flex flex-col gap-0.5">
          {messages.map((msg) => (
            <MessageItem
              key={msg.id}
              msg={msg}
              user={user}
              accentColor={getUserColor(msg.uid)}
              livePhotoURL={profileMap[msg.uid]}
              onStartPrivateChat={onStartPrivateChat}
              onReply={onReply}
              groupId={groupId}
              dateStr={formatMessageDate(msg.createdAt)}
            />
          ))}
          

        </div>
      </div>
    </div>
  );
}
