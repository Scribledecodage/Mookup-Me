'use client';

import React from 'react';
import { Brain, CaretLeft, PhoneCall, VideoCamera, Gear, Users, NotePencil, User } from '@phosphor-icons/react';
import UserAvatar from '@/components/ui/UserAvatar';
import GroupAvatar from '../ui/GroupAvatar';

interface ChatHeaderProps {
  groupId: string | null;
  displayName: string;
  displayAvatar: string | null;
  isCustomGroup: boolean;
  currentUserId?: string;
  // Menu dropdown (bot / snapchat uniquement)
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
  // Panel membres (groupes)
  isMembersPanelOpen: boolean;
  setIsMembersPanelOpen: (open: boolean) => void;
  // Panel contact (discussions privées)
  isContactPanelOpen: boolean;
  setIsContactPanelOpen: (open: boolean) => void;
  handleHeaderClick: () => void;
  handleStartCall: (type: 'audio' | 'video') => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
  onBack?: () => void;
  onNavigate?: (tab: string) => void;
  setShowCreateGroupModal: (show: boolean) => void;
}

export default function ChatHeader({
  groupId,
  displayName,
  displayAvatar,
  isCustomGroup,
  currentUserId,
  isMenuOpen,
  setIsMenuOpen,
  isMembersPanelOpen,
  setIsMembersPanelOpen,
  isContactPanelOpen,
  setIsContactPanelOpen,
  handleHeaderClick,
  handleStartCall,
  menuRef,
  onBack,
  onNavigate,
  setShowCreateGroupModal,
}: ChatHeaderProps) {
  const isGroup = groupId === 'general' || isCustomGroup || groupId === 'snapchat';
  const isPrivate = groupId?.startsWith('private_');
  const isSpecial = groupId?.startsWith('ai-') || groupId?.startsWith('botchat_') || groupId === 'snapchat';

  // UID de l'autre utilisateur dans une discussion privée
  const otherUserId = isPrivate && currentUserId
    ? groupId!.replace('private_', '').split('_').find(id => id !== currentUserId) ?? ''
    : '';

  return (
    <header className="bg-[#f9f9f9] px-4 py-3 h-[60px] flex justify-between items-center border-b border-gray-200 z-10 w-full overflow-hidden flex-shrink-0">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-200 rounded-full transition-all flex-shrink-0"
          >
            <CaretLeft size={22} />
          </button>
        )}
        <div
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-all border border-gray-200 overflow-hidden flex-shrink-0"
          onClick={handleHeaderClick}
        >
          {groupId === 'general' ? (
            <GroupAvatar size={40} />
          ) : groupId?.startsWith('ai-') ? (
            <div className="w-full h-full bg-[#6366f1] flex items-center justify-center">
              <img src="/BDDBOT.png" alt="BDD Bot" className="w-8 h-8 object-contain block" />
            </div>
          ) : groupId === 'snapchat' ? (
            <img src="/Logo.png" alt="Logo" className="w-full h-full object-cover block" />
          ) : isCustomGroup ? (
            displayAvatar ? (
              <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <GroupAvatar size={40} />
            )
          ) : groupId?.startsWith('private_') || groupId?.startsWith('botchat_') ? (
            displayAvatar ? (
              <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" />
            ) : groupId?.startsWith('botchat_') ? (
              <div className="bot-avatar-fallback flex h-full w-full items-center justify-center bg-gray-100">
                <Brain size={22} weight="duotone" className="text-gray-500" aria-hidden="true" />
              </div>
            ) : (
              <UserAvatar uid={otherUserId || groupId || ''} photoURL={null} displayName={displayName} size={40} />
            )
          ) : (
            <img src="/Logo.png" alt="Logo" className="w-full h-full object-cover block" />
          )}
        </div>
        <div className="min-w-0 flex-1 cursor-pointer" onClick={handleHeaderClick}>
          <h1 className="text-[16px] font-normal text-gray-800 leading-tight truncate pr-2 hover:underline dm-sans">
            {displayName}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-1 relative">
          {(!groupId?.startsWith('ai-') && groupId !== 'snapchat') && (
            <>
              <button
                onClick={() => handleStartCall('video')}
                className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-full transition-all flex items-center justify-center"
                title="Appel vidéo"
              >
                <VideoCamera size={19} />
              </button>
              <button
                onClick={() => handleStartCall('audio')}
                className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-full transition-all flex items-center justify-center mr-1"
                title="Appel vocal"
              >
                <PhoneCall size={19} />
              </button>
            </>
          )}

          {/* Team Mookup et BDD Bot : aucun bouton d'action dans le header */}
          {isSpecial ? null : isGroup ? (
            <button
              onClick={() => setIsMembersPanelOpen(!isMembersPanelOpen)}
              className={`p-2 rounded-full transition-all flex items-center justify-center ${
                isMembersPanelOpen
                  ? 'bg-gray-200 text-gray-700'
                  : 'text-gray-500 hover:bg-gray-200'
              }`}
              title="Membres"
            >
              <Users size={22} />
            </button>

          ) : isPrivate ? (
            /* Discussion privée → toggle panel contact */
            <button
              onClick={() => setIsContactPanelOpen(!isContactPanelOpen)}
              className={`p-2 rounded-full transition-all flex items-center justify-center ${
                isContactPanelOpen
                  ? 'bg-gray-200 text-gray-700'
                  : 'text-gray-500 hover:bg-gray-200'
              }`}
              title="Profil du contact"
            >
              <User size={22} />
            </button>

          ) : (
            /* Bot / snapchat → menu dropdown */
            <div ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-all flex items-center justify-center"
              >
                <User size={22} />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50 overflow-hidden">
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors text-sm text-gray-700 flex items-center gap-2.5"
                    onClick={() => {
                      if (onBack) onBack();
                      if (onNavigate) onNavigate('profil');
                    }}
                  >
                    <Gear size={20} />
                    Réglages
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateGroupModal(true);
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors text-sm text-gray-700 flex items-center gap-2.5"
                  >
                    <Users size={20} />
                    Créer un groupe
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors text-sm text-gray-700 flex items-center gap-2.5"
                    onClick={() => {
                      if (onBack) onBack();
                      if (onNavigate) onNavigate('commu');
                    }}
                  >
                    <NotePencil size={20} />
                    Nouvelle discussion
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
