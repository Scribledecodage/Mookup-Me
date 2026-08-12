'use client';

import React from 'react';
import { Brain, Laptop, DeviceMobile, Trash, UsersThree, X } from '@phosphor-icons/react';
import UserAvatar from '@/components/ui/UserAvatar';
import { usePresence } from '@/lib/presence';
import GroupAvatar from '@/components/ui/GroupAvatar';

interface DiscussionListProps {
  user?: any;
  selectedGroupId: string | null;
  onSelectGroup: (id: string | null, data?: { name: string, avatar?: string }) => void;
  unreadCounts: { [key: string]: number };
  lastMessageTimes: { [key: string]: string };
  privateChats?: any[];
  customGroups?: any[];
  allUsers?: any[];
  onDeletePrivateChat?: (id: string) => void;
}

function getMessagePreview(text: string) {
  return text
    .replace(/\r?\n+/g, ' ')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/^\s*\d+[.)]\s+/gm, '')
    .replace(/[`*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span className="absolute -right-1 -top-1 z-20 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm">
      {count > 99 ? '99+' : count}
    </span>
  );
}

function UnreadTime({ count, time, isSelected }: { count: number; time?: string; isSelected: boolean }) {
  if (count <= 0 || isSelected || !time) return null;
  return <span className="flex-shrink-0 text-[10px] font-medium text-red-500">{time}</span>;
}

export default function DiscussionList({
  user,
  selectedGroupId,
  onSelectGroup,
  unreadCounts,
  lastMessageTimes,
  privateChats = [],
  customGroups = [],
  allUsers = [],
  onDeletePrivateChat
}: DiscussionListProps) {
  const { onlineUsers } = usePresence(user?.uid, user?.displayName);

  const handleGroupSelect = (id: string, data?: { name: string, avatar?: string }) => {
    if (selectedGroupId === id) {
      onSelectGroup(null);
    } else {
      onSelectGroup(id, data);
    }
  };

  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain p-2 space-y-1 touch-pan-y">
      {/* Groupe Team Snapchat */}
      <div 
        onClick={() => handleGroupSelect('snapchat')}
        className={`flex items-center gap-3 py-2.5 px-3 cursor-pointer transition-all rounded-xl group ${
          selectedGroupId === 'snapchat' 
            ? 'bg-gray-100' 
            : 'hover:bg-gray-50'
        }`}
      >
        <div className="relative flex-shrink-0">
          <div className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-gray-100 overflow-hidden border border-gray-100 shadow-sm">
            <img src="/Logo.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
          {unreadCounts['snapchat'] > 0 && selectedGroupId !== 'snapchat' && <UnreadBadge count={unreadCounts['snapchat']} />}
        </div>
        <div className="flex-1 min-w-0 relative">
          <div className="flex justify-between items-baseline gap-2">
            <h2 className="flex min-w-0 items-center gap-1 pr-14 font-normal text-gray-800 text-[14.5px]" style={{ fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif' }}><span className="truncate">Team Mookup</span><UnreadTime count={unreadCounts['snapchat']} time={lastMessageTimes['snapchat']} isSelected={selectedGroupId === 'snapchat'} /></h2>
          </div>

        </div>
      </div>

      {/* Groupe Général */}
      <div 
        onClick={() => handleGroupSelect('general')}
        className={`flex items-center gap-3 py-2.5 px-3 cursor-pointer transition-all rounded-xl group ${
          selectedGroupId === 'general' 
            ? 'bg-gray-100' 
            : 'hover:bg-gray-50'
        }`}
      >
        <div className="relative flex-shrink-0">
          <div className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full overflow-hidden border border-gray-100 shadow-sm">
            <GroupAvatar size={44} />
          </div>
          {unreadCounts['general'] > 0 && selectedGroupId !== 'general' && <UnreadBadge count={unreadCounts['general']} />}
        </div>
        <div className="flex-1 min-w-0 relative">
          <div className="flex justify-between items-baseline gap-2">
            <h2 className="flex min-w-0 items-center gap-1 pr-14 font-normal text-gray-800 text-[14.5px]" style={{ fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif' }}><span className="truncate">Groupe Général</span><UnreadTime count={unreadCounts['general']} time={lastMessageTimes['general']} isSelected={selectedGroupId === 'general'} /></h2>
          </div>

        </div>
      </div>

      {/* Groupe My IA (Privé) */}
      <div 
        onClick={() => handleGroupSelect(`ai-${user?.uid}`)}
        className={`flex items-center gap-3 py-2.5 px-3 cursor-pointer transition-all rounded-xl group ${
          selectedGroupId === `ai-${user?.uid}` 
            ? 'bg-gray-100' 
            : 'hover:bg-gray-50'
        }`}
      >
        <div className="relative flex-shrink-0">
          <div className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full overflow-hidden shadow-sm bg-[#6366f1] flex items-center justify-center border border-gray-100">
            <img
              src="/BDDBOT.png"
              alt="BDD Bot"
              className="w-full h-full object-contain p-1.5 block"
            />
          </div>
          {unreadCounts[`ai-${user?.uid}`] > 0 && selectedGroupId !== `ai-${user?.uid}` && <UnreadBadge count={unreadCounts[`ai-${user?.uid}`]} />}
        </div>
        <div className="flex-1 min-w-0 relative">
          <div className="flex justify-between items-baseline gap-2">
            <h2 className="flex min-w-0 items-center gap-1 pr-14 font-normal text-gray-800 text-[14.5px]" style={{ fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif' }}><span className="truncate">BDD Bot</span><UnreadTime count={unreadCounts[`ai-${user?.uid}`]} time={lastMessageTimes[`ai-${user?.uid}`]} isSelected={selectedGroupId === `ai-${user?.uid}`} /></h2>
          </div>
        </div>
      </div>
      
      {/* Liste des groupes personnalisés */}
      {customGroups.map(group => {
        const photoURL = group.photoURL || '';
        const displayName = group.name || 'Groupe sans nom';
        
        let displayLastMessage = group.lastMessage || 'Nouveau groupe';
        if (group.clearedAt && group.clearedAt[user?.uid] && group.updatedAt) {
          const clearedTime = group.clearedAt[user?.uid].toDate?.()?.getTime() || 0;
          const updatedTime = group.updatedAt.toDate?.()?.getTime() || 0;
          if (clearedTime >= updatedTime) {
            displayLastMessage = 'Nouveau groupe';
          }
        }

        return (
          <div 
            key={group.id}
            onClick={() => handleGroupSelect(group.id, { name: displayName, avatar: photoURL })}
            className={`flex items-center gap-3 py-2.5 px-3 cursor-pointer transition-all rounded-xl group relative ${
              selectedGroupId === group.id 
                ? 'bg-gray-100' 
                : 'hover:bg-gray-50'
            }`}
          >
            <div className="relative flex-shrink-0">
              <div className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-gray-100 flex items-center justify-center border border-gray-100 shadow-sm text-gray-500 overflow-hidden">
                {photoURL ? (
                  <img src={photoURL} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <UsersThree size={24} />
                )}
              </div>
              {unreadCounts[group.id] > 0 && selectedGroupId !== group.id && <UnreadBadge count={unreadCounts[group.id]} />}
            </div>
            <div className="flex-1 min-w-0 relative pr-6">
              <div className="flex justify-between items-baseline gap-2">
                <h2 className="flex min-w-0 items-center gap-1 pr-14 font-normal text-gray-800 text-[14.5px]" style={{ fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif' }}><span className="truncate">{displayName}</span><UnreadTime count={unreadCounts[group.id]} time={lastMessageTimes[group.id]} isSelected={selectedGroupId === group.id} /></h2>
              </div>

            </div>
          </div>
        );
      })}

      {/* Liste des conversations privées */}
      {privateChats.map(chat => {
        const isBotChat = Boolean(chat.isBotChat || chat.botId);
        const otherUserId = isBotChat
          ? `bot-${chat.botId}`
          : chat.participants.find((id: string) => id !== user?.uid);
        const otherUser = allUsers.find(u => u.id === otherUserId || u.uid === otherUserId);
        const displayName = isBotChat
          ? chat.botName || 'Bot'
          : otherUser?.displayName || otherUser?.nickname || 'Anonyme';
        const photoURL = isBotChat && chat.botPhotoURL && chat.botPhotoURL !== '/Logo.png'
          ? chat.botPhotoURL
          : isBotChat ? '' : otherUser?.photoURL;

        const onlineUser = onlineUsers.find(u => u.uid === otherUserId);
        const typingUser = onlineUsers.find(u => u.uid === otherUserId && u.isTyping && u.typingIn === chat.id);
        const isOnline = !!onlineUser;
        const device = onlineUser?.device || 'desktop';
        
        // Déterminer si le dernier message a été effacé par cet utilisateur
        let displayLastMessage = chat.lastMessage || 'Nouvelle conversation';
        if (chat.clearedAt && chat.clearedAt[user?.uid] && chat.updatedAt) {
          const clearedTime = chat.clearedAt[user?.uid].toDate?.()?.getTime() || 0;
          const updatedTime = chat.updatedAt.toDate?.()?.getTime() || 0;
          if (clearedTime >= updatedTime) {
            displayLastMessage = 'Nouvelle conversation';
          }
        }

        return (
          <div 
            key={chat.id}
            onClick={() => handleGroupSelect(chat.id, { name: displayName, avatar: photoURL })}
            className={`flex items-center gap-3 py-2.5 px-3 cursor-pointer transition-all rounded-xl group relative ${
              selectedGroupId === chat.id 
                ? 'bg-gray-100' 
                : 'hover:bg-gray-50'
            }`}
          >
            <div className="relative flex-shrink-0">
              <div className="relative">
                <div className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-gray-100 flex items-center justify-center border border-gray-100 shadow-sm text-gray-500 overflow-hidden">
                  {photoURL ? (
                    <img src={photoURL} alt={displayName} className="w-full h-full object-cover" />
                  ) : isBotChat ? (
                    <Brain size={22} weight="duotone" className="text-gray-500" aria-hidden="true" />
                  ) : (
                    <UserAvatar uid={otherUserId || ''} photoURL={null} displayName={displayName} size={44} />
                  )}
                </div>
                {unreadCounts[chat.id] > 0 && selectedGroupId !== chat.id && <UnreadBadge count={unreadCounts[chat.id]} />}
              </div>
              {/* Pastille ou icône selon le statut et l'appareil */}
              {!isBotChat && isOnline ? (
                <div className="absolute -bottom-0.5 -right-0.5 w-[19px] h-[19px] bg-white rounded-full p-0.5 shadow border border-gray-100 flex items-center justify-center z-10" title={device === 'phone' ? "En ligne (Mobile)" : "En ligne (PC)"}>
                  {device === 'phone' ? (
                    <DeviceMobile size={13} className="text-blue-500" weight="bold" />
                  ) : (
                    <Laptop size={13} className="text-blue-500" weight="bold" />
                  )}
                </div>
              ) : !isBotChat ? (
                <div className="absolute -bottom-0.5 -right-0.5 w-[14px] h-[14px] bg-gray-400 border-2 border-white rounded-full z-10" title="Hors ligne" />
              ) : null}
            </div>
            <div className="flex-1 min-w-0 relative pr-6">
              <div className="flex justify-between items-baseline gap-2">
                <h2 className="flex min-w-0 items-center gap-1 pr-14 font-normal text-gray-800 text-[14.5px]" style={{ fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif' }}><span className="truncate">{displayName}</span><UnreadTime count={unreadCounts[chat.id]} time={lastMessageTimes[chat.id]} isSelected={selectedGroupId === chat.id} /></h2>
              </div>
              {/* Dernier message ou statut « écrit… » animé */}
              <div className="mt-0.5 flex min-h-[18px] max-w-[85%] items-center truncate text-xs text-gray-500">
                {typingUser ? (
                  <span className="contact-typing-preview flex items-center gap-1.5 truncate font-medium text-[#5865f2]" aria-label={`${displayName} écrit`}>
                    <span className="contact-typing-dots flex shrink-0 items-center gap-[3px]" aria-hidden="true">
                      <span className="contact-typing-dot" />
                      <span className="contact-typing-dot" />
                      <span className="contact-typing-dot" />
                    </span>
                    <span className="truncate">écrit…</span>
                  </span>
                ) : (
                  <span className="block min-w-0 truncate whitespace-nowrap">{getMessagePreview(displayLastMessage)}</span>
                )}
              </div>

            </div>
            {/* Bouton de fermeture / suppression (toujours sur mobile, uniquement sélectionné sur PC) */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (onDeletePrivateChat) onDeletePrivateChat(chat.id);
              }}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors z-10 items-center justify-center ${
                selectedGroupId === chat.id ? 'flex' : 'flex md:hidden'
              }`}
              title="Supprimer la conversation"
            >
              <X size={18} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
