'use client';

import React, { useEffect, useState } from 'react';
import { X, Desktop, DeviceMobile, PhoneCall, VideoCamera } from '@phosphor-icons/react';
import UserAvatar from '@/components/ui/UserAvatar';
import { OnlineUser } from '@/lib/presence';
import { extractColors, buildMeshGradient, buildMeshGradientFromColor } from '@/lib/colorUtils';
import { getUserColor } from '@/lib/getUserColor';

interface ContactPanelProps {
  isOpen: boolean;
  onClose: () => void;
  displayName: string;
  displayAvatar?: string | null;
  onlineUsers: OnlineUser[];
  otherUserId: string | null;
  onStartCall: (type: 'audio' | 'video') => void;
  onViewFullProfile: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

function useMeshGradient(src: string | null | undefined, fallbackUid?: string | null): string {
  const [gradient, setGradient] = useState(() =>
    fallbackUid
      ? buildMeshGradientFromColor(getUserColor(fallbackUid))
      : 'linear-gradient(135deg, #d1d5db, #9ca3af)'
  );

  useEffect(() => {
    if (!src) {
      // Pas de photo : gradient depuis la couleur UID
      setGradient(fallbackUid
        ? buildMeshGradientFromColor(getUserColor(fallbackUid))
        : 'linear-gradient(135deg, #d1d5db, #9ca3af)'
      );
      return;
    }
    let cancelled = false;
    extractColors(src).then(colors => {
      if (!cancelled) setGradient(buildMeshGradient(colors));
    });
    return () => { cancelled = true; };
  }, [src, fallbackUid]);

  return gradient;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function ContactPanel({
  isOpen,
  onClose,
  displayName,
  displayAvatar,
  onlineUsers,
  otherUserId,
  onStartCall,
  onViewFullProfile,
}: ContactPanelProps) {
  // Animation state
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (isOpen && otherUserId) {
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(t);
    }
  }, [isOpen, otherUserId]);

  const onlineInfo = onlineUsers.find(u => u.uid === otherUserId);
  const isOnline = !!onlineInfo;
  const device = onlineInfo?.device || 'desktop';

  const bannerGradient = useMeshGradient(displayAvatar, otherUserId);

  if (!mounted || !otherUserId) return null;

  return (
    <>
      {/* Overlay mobile */}
      <div
        className="md:hidden absolute inset-x-0 z-20 bg-black/30 transition-opacity duration-300"
        style={{
          top: 0,
          bottom: 0,
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? 'auto' : 'none',
        }}
        onClick={onClose}
      />

      {/* Panneau */}
      <div
        className={[
          'absolute right-0 z-30 bg-white border-l border-gray-200',
          // Desktop : inchangé
          'md:relative md:w-80 md:flex-shrink-0 md:top-0 md:bottom-0 md:h-full',
          // Mobile : toute la largeur, remplit tout l'espace disponible
          'w-full inset-0',
          'transition-transform duration-300 ease-in-out',
        ].join(' ')}
        style={{
          transform: isMobile && !visible ? 'translateX(100%)' : 'translateX(0)',
        }}
      >
        <div className="flex flex-col h-full overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-gray-100 flex-shrink-0">
            <span className="text-[13px] font-semibold text-gray-600" style={{ fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif' }}>Profil</span>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Fermer"
            >
              <X size={18} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 flex flex-col">
            {/* Bannière mesh gradient */}
            <div className="flex-shrink-0">
              <div
                className="transition-all duration-700"
                style={{ background: bannerGradient, height: '120px' }}
              />

              <div className="px-4 -mt-8 pb-3 flex items-end justify-between">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-white bg-gray-100 overflow-hidden shadow-md flex items-center justify-center">
                    {displayAvatar
                      ? <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" />
                      : <UserAvatar uid={otherUserId || ''} photoURL={null} displayName={displayName} size={64} />
                    }
                  </div>
                  <div
                    className={`absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full border-2 border-white ${isOnline ? 'bg-blue-500' : 'bg-gray-400'}`}
                    title={isOnline ? (device === 'phone' ? 'En ligne (Mobile)' : 'En ligne (PC)') : 'Hors ligne'}
                  />
                </div>

                <div className="flex gap-2 mb-1">
                  <button onClick={() => { onStartCall('audio'); onClose(); }} className="p-2 bg-white/90 hover:bg-gray-100 rounded-full shadow-sm transition-colors" title="Appel vocal">
                    <PhoneCall size={17} className="text-gray-700" />
                  </button>
                  <button onClick={() => { onStartCall('video'); onClose(); }} className="p-2 bg-white/90 hover:bg-gray-100 rounded-full shadow-sm transition-colors" title="Appel vidéo">
                    <VideoCamera size={17} className="text-gray-700" />
                  </button>
                </div>
              </div>
            </div>

            {/* Nom + statut */}
            <div className="px-4 pb-4 border-b border-gray-100">
              <h2 className="text-[16px] font-semibold text-gray-900 leading-tight truncate" style={{ fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif' }}>{displayName}</h2>
              <div className="flex items-center gap-1.5 mt-1">
                {isOnline ? (
                  <>
                    {device === 'phone'
                      ? <DeviceMobile size={12} className="text-blue-500" />
                      : <Desktop size={12} className="text-blue-500" />
                    }
                    <span className="text-[12px] text-blue-500 font-medium">
                      En ligne{device === 'phone' ? ' · Mobile' : ' · PC'}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                    <span className="text-[12px] text-gray-400">Hors ligne</span>
                  </>
                )}
              </div>
            </div>

            {/* Note */}
            <div className="px-4 py-4 flex-1">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Note</p>
              <p className="text-[12px] text-gray-400 italic">Cliquer sur l'avatar pour voir le profil complet.</p>
            </div>

            {/* Bouton bas */}
            <div className="px-4 pb-5 flex-shrink-0">
              <button type="button" onClick={onViewFullProfile} className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors text-[13px] font-medium text-gray-600">
                Voir le profil complet
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
