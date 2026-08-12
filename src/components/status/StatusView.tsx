'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import StatusCreator from './StatusCreator';
import StatusViewer from './StatusViewer';
import UserAvatar from '@/components/ui/UserAvatar';
import { Pulse, FileImage, PencilSimple, Plus } from '@phosphor-icons/react';

// ─── Anneau segmenté façon WhatsApp ──────────────────────────────────────────
export function StatusRing({
  count,
  size = 50,
  color = '#8b5cf6',
  strokeWidth = 3,
}: {
  count: number;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = count > 1 ? 4 : 0; // px de gap entre les segments
  const segmentLength = (circumference - gap * count) / count;
  const center = size / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
    >
      {Array.from({ length: count }).map((_, i) => {
        const rotate = -90 + (i * 360) / count;
        return (
          <circle
            key={i}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
            strokeDashoffset={circumference * 0.25}
            strokeLinecap="round"
            transform={`rotate(${rotate} ${center} ${center})`}
          />
        );
      })}
    </svg>
  );
}

interface StatusItem {
  id: string;
  type: 'text' | 'image' | 'video';
  content: string;
  bgColor?: string;
  createdAt: Timestamp;
}

interface StatusUser {
  uid: string;
  displayName?: string | null;
  photoURL?: string | null;
}

interface UserStatus {
  uid: string;
  displayName: string;
  photoURL: string;
  items: StatusItem[];
  updatedAt: Timestamp;
}

function getInitialStatusRoute(): { creation: 'text' | 'media' | null; viewingUid: string | null } {
  if (typeof window === 'undefined') return { creation: null, viewingUid: null };
  const parts = window.location.pathname.split('/').filter(Boolean);
  if (parts[0] !== 'statuts') return { creation: null, viewingUid: null };
  if (parts[1] === 'creer' && parts[2] === 'texte') return { creation: 'text', viewingUid: null };
  if (parts[1] === 'creer' && parts[2] === 'media') return { creation: 'media', viewingUid: null };
  if (parts[1] === 'voir' && parts[2]) {
    try {
      return { creation: null, viewingUid: decodeURIComponent(parts[2]) };
    } catch {
      return { creation: null, viewingUid: parts[2] };
    }
  }
  return { creation: null, viewingUid: null };
}

export default function StatusView({ user }: { user: StatusUser }) {
  const initialRoute = getInitialStatusRoute();
  const [statuses, setStatuses] = useState<UserStatus[]>([]);
  const [myStatus, setMyStatus] = useState<UserStatus | null>(null);
  
  const [isCreatingText, setIsCreatingText] = useState(initialRoute.creation === 'text');
  const [isCreatingMedia, setIsCreatingMedia] = useState(initialRoute.creation === 'media');
  const [selectedMediaFile, setSelectedMediaFile] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Intercepte le retour physique pour fermer le créateur aussi
  useEffect(() => {
    const handleAppBack = () => {
      if (isCreatingText || isCreatingMedia) {
        closeStatusCreator();
        window._appBackHandled = true;
      }
    };
    window.addEventListener('app_back', handleAppBack);
    return () => window.removeEventListener('app_back', handleAppBack);
  }, [isCreatingText, isCreatingMedia]);
  
  const [viewingStatusUid, setViewingStatusUid] = useState<string | null>(initialRoute.viewingUid);
  const [viewingStatusUser, setViewingStatusUser] = useState<UserStatus | null>(null);

  const closeStatusCreator = () => {
    setIsCreatingText(false);
    setIsCreatingMedia(false);
    setSelectedMediaFile(null);
    if (window.location.pathname.startsWith('/statuts/creer')) {
      window.history.replaceState({ appPage: '/statuts' }, '', '/statuts');
    }
  };

  const closeStatusViewer = () => {
    setViewingStatusUser(null);
    setViewingStatusUid(null);
    if (window.location.pathname.startsWith('/statuts/voir')) {
      window.history.replaceState({ appPage: '/statuts' }, '', '/statuts');
    }
  };

  // Chaque sous-écran de statut possède sa propre URL partageable.
  useEffect(() => {
    if (isCreatingText) {
      const path = '/statuts/creer/texte';
      if (window.location.pathname !== path) window.history.pushState({ appSubPage: path }, '', path);
    } else if (isCreatingMedia) {
      const path = '/statuts/creer/media';
      if (window.location.pathname !== path) window.history.pushState({ appSubPage: path }, '', path);
    }
  }, [isCreatingText, isCreatingMedia]);

  useEffect(() => {
    if (viewingStatusUser) {
      const path = `/statuts/voir/${encodeURIComponent(viewingStatusUser.uid)}`;
      if (window.location.pathname !== path) window.history.pushState({ appSubPage: path }, '', path);
    }
  }, [viewingStatusUser]);

  // Intercepte le retour physique pour fermer le viewer
  useEffect(() => {
    const handleAppBack = () => {
      if (viewingStatusUser) {
        closeStatusViewer();
        window._appBackHandled = true;
      }
    };
    window.addEventListener('app_back', handleAppBack);
    return () => window.removeEventListener('app_back', handleAppBack);  }, [viewingStatusUser]);

  // Restaure un statut directement depuis /statuts/voir/:uid après le chargement Firestore.
  useEffect(() => {
    if (!viewingStatusUid || viewingStatusUser) return;
    const matchingStatus = viewingStatusUid === user.uid
      ? myStatus
      : statuses.find(status => status.uid === viewingStatusUid) || null;
    if (matchingStatus) setViewingStatusUser(matchingStatus);
  }, [myStatus, statuses, user.uid, viewingStatusUid, viewingStatusUser]);

  const handleMediaClick = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedMediaFile(file);
      setIsCreatingMedia(true);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  useEffect(() => {
    if (!user) return;

    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const q = query(
      collection(db, 'statuses'),
      where('updatedAt', '>', twentyFourHoursAgo)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allStatuses: UserStatus[] = [];
      let myStat: UserStatus | null = null;

      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data() as UserStatus;
        const validItems = (data.items || []).filter(item => {
          if (!item.createdAt) return false;
          const itemDate = item.createdAt.toDate();
          return itemDate > twentyFourHoursAgo;
        });

        if (validItems.length > 0) {
          const userStatus = { ...data, uid: docSnap.id, items: validItems };
          if (docSnap.id === user.uid) {
            myStat = userStatus;
          } else {
            allStatuses.push(userStatus);
          }
        }
      });

      allStatuses.sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis());
      
      setStatuses(allStatuses);
      setMyStatus(myStat);
    });

    return () => unsubscribe();
  }, [user]);

  if (isCreatingText) {
    return <StatusCreator user={user} type="text" onClose={closeStatusCreator} />;
  }

  if (isCreatingMedia) {
    return (
      <StatusCreator 
        user={user} 
        type="media" 
        initialFile={selectedMediaFile}
        onClose={closeStatusCreator}
      />
    );
  }

  if (viewingStatusUser) {
    return (
      <StatusViewer 
        key={viewingStatusUser.uid}
        userStatus={viewingStatusUser} 
        currentUserId={user?.uid}
        onClose={closeStatusViewer}
      />
    );
  }

  return (
    <div className="status-list-view flex flex-col h-full bg-[#f0f2f5] overflow-y-auto">
      <input 
        type="file" 
        accept="image/*,video/*" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
      />

      <div className="status-list-card bg-white px-4 py-3 mt-2 shadow-sm flex items-center justify-between cursor-pointer" onClick={() => myStatus ? setViewingStatusUser({ ...myStatus, photoURL: user?.photoURL || myStatus.photoURL }) : handleMediaClick()}>
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0" style={{ width: 50, height: 50 }}>
            {/* Anneau segmenté selon le nb de statuts */}
            {myStatus && (
              <StatusRing count={myStatus.items.length} size={50} strokeWidth={3} />
            )}
            <div className={myStatus ? 'p-[4px]' : 'p-[3px]'}>
              <UserAvatar
                uid={user?.uid || ''}
                photoURL={user?.photoURL || undefined}
                displayName={user?.displayName || undefined}
                size={myStatus ? 42 : 44}
              />
            </div>
            {!myStatus && (
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white">
                <Plus size={10} weight="bold" className="text-white" />
              </div>
            )}
          </div>
          <div>
            <h2 className="text-[16px] font-medium text-gray-800">Mon statut</h2>
            <p className="text-[14px] text-gray-500">
              {myStatus ? 'Appuyez pour voir votre statut' : 'Ajouter au statut'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            type="button"
            className="status-action-button w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors z-10 relative"
            onClick={handleMediaClick}
            onTouchEnd={handleMediaClick}
          >
            <FileImage size={20} className="status-action-icon text-gray-600" />
          </button>
          <button 
            type="button"
            className="status-action-button w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors z-10 relative"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsCreatingText(true); }}
            onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setIsCreatingText(true); }}
          >
            <PencilSimple size={20} className="status-action-icon text-gray-600" />
          </button>
        </div>
      </div>

      <div className="px-4 py-2 mt-2">
        <h3 className="status-section-label text-[14px] font-medium text-gray-500 uppercase">Statuts récents</h3>
      </div>

      <div className="status-list-card bg-white shadow-sm flex-1">
        {statuses.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="status-empty-icon w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Pulse size={40} className="status-empty-icon-symbol text-gray-400" />
            </div>
            <p className="text-gray-500 text-[15px]">Aucune mise à jour récente</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {statuses.map(stat => (
              <div 
                key={stat.uid} 
                className="status-list-item flex items-center gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                onClick={() => setViewingStatusUser(stat)}
                onTouchEnd={(e) => { e.preventDefault(); setViewingStatusUser(stat); }}
              >
                <div 
                  className="relative flex-shrink-0 flex items-center justify-center"
                  style={{ width: 48, height: 48 }}
                >
                  <StatusRing count={stat.items.length} size={48} strokeWidth={3} />
                  <div className="p-[4px]">
                    <UserAvatar
                      uid={stat.uid}
                      photoURL={stat.photoURL}
                      displayName={stat.displayName}
                      size={40}
                    />
                  </div>
                </div>
                <div className="flex flex-col">
                  <h2 className="status-list-name text-[16px] font-medium text-gray-800">{stat.displayName}</h2>
                  <p className="status-list-meta text-[13px] text-gray-500">
                    Aujourd&apos;hui à {stat.updatedAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
