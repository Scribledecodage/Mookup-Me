'use client';

import React, { useState } from 'react';
import { Laptop, MagnifyingGlass, DeviceMobile, UserCircle } from '@phosphor-icons/react';
import UserAvatar from '@/components/ui/UserAvatar';
import { usePresence } from '@/lib/presence';
import { auth } from '@/lib/firebase';

interface SearchViewProps {
  users?: any[];
  onStartPrivateChat?: (user: any) => void;
}

export default function SearchView({ users = [], onStartPrivateChat }: SearchViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { onlineUsers } = usePresence(auth.currentUser?.uid || undefined);

  const filteredUsers = users.filter((u) => {
    const name = (u.displayName || u.nickname || '').toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Barre de recherche */}
      <div className="p-4">
        <div className="relative flex items-center">
          <MagnifyingGlass size={20} className="absolute left-3 text-gray-400" />
          <input 
            type="text" 
            placeholder="Rechercher par pseudo..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-100 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
      </div>
      
      {/* Suggestions */}
      <div className="px-4 py-2 overflow-y-auto">
        <h3 className="text-[13px] font-medium text-gray-500 mb-4">
          {searchTerm ? 'Résultats de recherche' : 'Voici des suggestions pour vous'}
        </h3>
        
        <div className="space-y-3">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((u) => {
              const targetUid = u.id || u.uid;
              const onlineUser = onlineUsers.find(ou => ou.uid === targetUid);
              const isOnline = !!onlineUser;
              const device = onlineUser?.device || 'desktop';

              return (
                <div 
                  key={targetUid} 
                  onClick={() => {
                    if (onStartPrivateChat) {
                      onStartPrivateChat(u);
                      setSearchTerm('');
                    }
                  }}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl cursor-pointer transition-all group"
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-[46px] h-[46px] min-w-[46px] min-h-[46px] rounded-full bg-gray-100 overflow-hidden border border-gray-100 flex items-center justify-center text-gray-400 shadow-sm">
                      {u.photoURL ? (
                        <img src={u.photoURL} alt={u.displayName || u.nickname} className="w-full h-full object-cover" />
                      ) : (
                        <UserAvatar uid={targetUid} photoURL={null} displayName={u.displayName || u.nickname} size={46} />
                      )}
                    </div>
                    {/* Status Badge */}
                    {isOnline ? (
                      <div className="absolute -bottom-0.5 -right-0.5 w-[19px] h-[19px] bg-white rounded-full p-0.5 shadow border border-gray-100 flex items-center justify-center z-10" title={device === 'phone' ? "En ligne (Mobile)" : "En ligne (PC)"}>
                        {device === 'phone' ? (
                          <DeviceMobile size={13} className="text-blue-500" weight="bold" />
                        ) : (
                          <Laptop size={13} className="text-blue-500" weight="bold" />
                        )}
                      </div>
                    ) : (
                      <div className="absolute -bottom-0.5 -right-0.5 w-[14px] h-[14px] bg-gray-400 border-2 border-white rounded-full z-10" title="Hors ligne" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14.5px] font-normal text-gray-800 truncate">{u.displayName || u.nickname || 'Anonyme'}</p>
                    <p className="text-[11px] text-gray-400">{searchTerm ? 'Utilisateur trouvé' : 'Utilisateur suggéré'}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400">
              <UserCircle size={40} className="mb-2 opacity-20" />
              <p className="text-xs">Aucun utilisateur trouvé pour "{searchTerm}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
