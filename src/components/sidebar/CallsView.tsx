'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Check, Phone, PhoneCall, Trash, VideoCamera } from '@phosphor-icons/react';
import UserAvatar from '@/components/ui/UserAvatar';
import SearchView from './SearchView';

interface CallsViewProps {
  user: any;
  allUsers: any[];
}

export default function CallsView({ user, allUsers }: CallsViewProps) {
  const [calls, setCalls] = useState<any[]>([]);
  const [showNewCall, setShowNewCall] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;

    // Récupérer l'historique des appels de l'utilisateur sans orderBy/limit serveur
    // pour éviter d'avoir besoin d'un index composite Firebase. Le tri et la limite
    // seront gérés côté client.
    const q = query(
      collection(db, 'calls'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let callsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      
      // Tri côté client par date de démarrage (décroissant)
      callsData.sort((a, b) => {
        const dateA = a.startedAt?.toDate?.()?.getTime() || 0;
        const dateB = b.startedAt?.toDate?.()?.getTime() || 0;
        return dateB - dateA;
      });
      
      // Limiter aux 50 derniers appels
      callsData = callsData.slice(0, 50);
      
      setCalls(callsData);
    });

    return () => unsubscribe();
  }, [user]);

  const handleStartCall = async (type: 'audio' | 'video') => {
    if (!user || selectedUsers.length === 0) return;
    
    // Générer un nom de salle Daily sûr et partageable uniquement via les tokens serveur
    const roomId = `MookupRoom${Date.now()}${Math.random().toString(36).substr(2, 6)}`.replace(/[^a-zA-Z0-9]/g, '');
    
    try {
      await addDoc(collection(db, 'calls'), {
        roomName: roomId,
        type,
        initiatorId: user.uid,
        initiatorName: user.displayName || 'Anonyme',
        initiatorAvatar: user.photoURL || '',
        participants: [user.uid, ...selectedUsers],
        status: 'calling',
        startedAt: serverTimestamp(),
        acceptedBy: [],
        declinedBy: []
      });
      
      setShowNewCall(false);
      setSelectedUsers([]);
    } catch (err) {
      console.error("Erreur création appel:", err);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleDeleteCall = async (callId: string) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cet appel de votre historique ?")) return;
    try {
      await deleteDoc(doc(db, 'calls', callId));
    } catch (err) {
      console.error("Erreur lors de la suppression de l'appel:", err);
    }
  };

  if (showNewCall) {
    return (
      <div className="flex flex-col h-full bg-white relative z-10">
        <div className="flex items-center px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-20">
          <button 
            onClick={() => {
              setShowNewCall(false);
              setSelectedUsers([]);
            }}
            className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-full text-gray-500 hover:text-gray-800 hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-lg font-medium text-gray-800 ml-4 flex-1">Nouvel appel</h1>
          {selectedUsers.length > 0 && (
            <div className="flex gap-2">
              <button 
                onClick={() => handleStartCall('audio')}
                className="w-10 h-10 flex items-center justify-center bg-blue-50 text-blue-500 rounded-full hover:bg-blue-100 transition-colors"
              >
                <Phone size={20} />
              </button>
              <button 
                onClick={() => handleStartCall('video')}
                className="w-10 h-10 flex items-center justify-center bg-blue-50 text-blue-500 rounded-full hover:bg-blue-100 transition-colors"
              >
                <VideoCamera size={20} />
              </button>
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {allUsers.map((u: any) => {
            const isSelected = selectedUsers.includes(u.id);
            return (
              <button 
                key={u.id} 
                type="button"
                onClick={() => toggleUserSelection(u.id)}
                className={`w-full flex items-center justify-between p-3 cursor-pointer border-b border-gray-50 transition-colors text-left ${isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border border-gray-200">
                    <UserAvatar uid={u.id || ''} photoURL={u.photoURL || null} displayName={u.displayName || u.nickname} size={48} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-800 truncate">{u.displayName || u.nickname}</h3>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                    {isSelected && <Check size={16} className="text-white" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="flex-1 overflow-y-auto">
        {calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-400">
            <div className="p-4 bg-gray-50 rounded-full mb-4">
              <Phone size={48} className="opacity-20" />
            </div>
            <p className="text-sm">Aucun appel récent</p>
          </div>
        ) : (
          <div className="py-2 pb-24">
            <p className="px-4 py-2 text-[13px] font-bold text-gray-400 uppercase tracking-wider">Récent</p>
            {calls.map((call) => {
              const isOutgoing = call.initiatorId === user.uid;
              const hasAccepted = call.acceptedBy?.includes(user.uid) || call.initiatorId === user.uid;
              const isMissed = !isOutgoing && call.status === 'ended' && !hasAccepted;
              
              // Déterminer les infos à afficher
              let callName = isOutgoing ? 'Appel sortant' : call.initiatorName;
              let callAvatar = isOutgoing ? null : call.initiatorAvatar;
              let callUid = isOutgoing ? '' : (call.initiatorId || '');
              
              // Si c'est un appel sortant, on essaie de trouver le nom et l'avatar du destinataire
              if (isOutgoing) {
                // S'il s'agit d'un appel de groupe
                if (call.groupName) {
                  callName = call.groupName;
                  // Pas d'avatar spécifique pour le groupe pour l'instant
                } else if (call.participants && call.participants.length > 0) {
                  // Trouver le destinataire (le premier qui n'est pas moi)
                  const targetId = call.participants.find((id: string) => id !== user.uid);
                  if (targetId) {
                    callUid = targetId;
                    const targetUser = allUsers.find(u => u.id === targetId);
                    if (targetUser) {
                      callName = targetUser.displayName || targetUser.nickname || 'Utilisateur';
                      callAvatar = targetUser.photoURL || null;
                    }
                  }
                }
              }
              
              return (
                <div key={call.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 group">
                  <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center">
                    <UserAvatar uid={callUid} photoURL={callAvatar} displayName={callName} size={48} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-medium text-[16px] truncate ${isMissed ? 'text-red-500' : 'text-gray-800'}`}>
                      {callName}
                    </h3>
                    <div className="flex items-center gap-1 text-[13px] text-gray-500 mt-0.5">
                      {isOutgoing ? (
                        <ArrowUpRight size={14} className="text-blue-500" />
                      ) : (
                        <ArrowDownLeft size={14} className={isMissed ? 'text-red-500' : 'text-blue-500'} />
                      )}
                      <span>
                        {call.startedAt ? new Date(call.startedAt.toDate()).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 pr-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCall(call.id);
                      }}
                      className="p-2.5 text-red-500 hover:bg-gray-100 rounded-full transition-all flex items-center justify-center"
                      title="Supprimer l'appel"
                    >
                      <Trash size={20} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Relancer l'appel si on clique sur l'icône (bonus pratique)
                        if (call.participants && call.participants.length > 0) {
                          const targetIds = call.participants.filter((id: string) => id !== user.uid);
                          if (targetIds.length > 0) {
                            setSelectedUsers(targetIds);
                            handleStartCall(call.type);
                          }
                        }
                      }}
                      className={`p-2.5 rounded-full transition-all flex items-center justify-center hover:bg-gray-100 text-blue-500`}
                      title={call.type === 'video' ? "Rappeler en vidéo" : "Rappeler"}
                    >
                      {call.type === 'video' ? <VideoCamera size={20} /> : <Phone size={20} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button 
        onClick={() => setShowNewCall(true)}
        className="absolute bottom-6 right-6 w-14 h-14 bg-blue-500 text-white rounded-2xl flex items-center justify-center shadow-lg hover:bg-blue-600 transition-all hover:scale-105 active:scale-95"
      >
        <PhoneCall size={28} />
      </button>
    </div>
  );
}
