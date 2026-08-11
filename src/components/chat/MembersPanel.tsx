'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Laptop, DeviceMobile } from '@phosphor-icons/react';
import UserAvatar from '@/components/ui/UserAvatar';
import { OnlineUser } from '@/lib/presence';
import { extractColors, RGB } from '@/lib/colorUtils';
import { getUserColor } from '@/lib/getUserColor';

interface MemberUser {
  id: string;
  displayName?: string;
  nickname?: string;
  photoURL?: string;
  isBddBot?: boolean;
  isTeamMookup?: boolean;
}

interface MembersPanelProps {
  isOpen: boolean;
  groupId?: string | null;
  onClose: () => void;
  allGroupUsers: MemberUser[];
  onlineUsers: OnlineUser[];
  currentUserId: string;
  onStartPrivateChat?: (user: { uid: string; displayName: string; photoURL?: string }) => void;
}

// ─── Helper gradient ──────────────────────────────────────────────────────────

function buildRowGradient(r: number, g: number, b: number, opacity: number): string {
  return `linear-gradient(to left, rgba(${r},${g},${b},${opacity}), rgba(255,255,255,0))`;
}

const BDD_BOT_GRADIENT = buildRowGradient(99, 102, 241, 0.12);
const FALLBACK_GRADIENT = 'transparent';

// ─── Hook cache centralisé ────────────────────────────────────────────────────
/**
 * Maintient un Map uid → gradient string stable dans un ref.
 * Ne déclenche un re-render que quand une nouvelle entrée est ajoutée/mise à jour.
 * Ainsi, réordonner la liste (online ↔ offline) ne recrée aucun état local
 * et ne provoque aucun flash.
 */
function useGradientCache(members: MemberUser[]): Record<string, string> {
  const cacheRef = useRef<Record<string, string>>({});
  const [, setVersion] = useState(0);

  useEffect(() => {
    let dirty = false;

    // Users sans photo → gradient immédiat depuis getUserColor
    members
      .filter(u => !u.isBddBot && !u.photoURL && !cacheRef.current[u.id])
      .forEach(u => {
        const hex = getUserColor(u.id);
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        cacheRef.current[u.id] = buildRowGradient(r, g, b, 0.16);
        dirty = true;
      });

    // Users avec photo → extraction async des couleurs dominantes
    const promises = members
      .filter(u => !u.isBddBot && u.photoURL && !cacheRef.current[u.id])
      .map(async u => {
        cacheRef.current[u.id] = FALLBACK_GRADIENT;
        const colors: RGB[] = await extractColors(u.photoURL!);
        cacheRef.current[u.id] =
          colors.length > 0
            ? buildRowGradient(colors[0][0], colors[0][1], colors[0][2], 0.16)
            : FALLBACK_GRADIENT;
        dirty = true;
      });

    if (promises.length > 0) {
      Promise.all(promises).then(() => {
        if (dirty) setVersion(v => v + 1);
      });
    } else if (dirty) {
      setVersion(v => v + 1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members.map(u => u.id).join(',')]);

  return cacheRef.current;
}

// ─── Sous-composant membre ────────────────────────────────────────────────────

const MemberRow = React.memo(function MemberRow({
  u,
  gradient,
  onlineUsers,
  currentUserId,
  onStartPrivateChat,
  onClose,
}: {
  u: MemberUser;
  gradient: string;
  onlineUsers: OnlineUser[];
  currentUserId: string;
  onStartPrivateChat?: MembersPanelProps['onStartPrivateChat'];
  onClose: () => void;
}) {
  const onlineInfo = onlineUsers.find(o => o.uid === u.id);
  // L'utilisateur courant est toujours considéré online (évite le grisage pendant le typing)
  const isOnline   = u.id === currentUserId || !!onlineInfo;
  const device     = onlineInfo?.device;
  const name       = u.displayName || u.nickname || onlineInfo?.displayName || '';
  const [hovered, setHovered] = useState(false);

  // Un user offline redevient "visuel online" au hover
  const showAsOnline = isOnline || (!u.isBddBot && !u.isTeamMookup && hovered);

  return (
    <div
      className="px-2 py-0.5 cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => {
        if (u.isBddBot || u.isTeamMookup) return;
        if (onStartPrivateChat)
          onStartPrivateChat({ uid: u.id, displayName: name || 'Anonyme', photoURL: u.photoURL });
        onClose();
      }}
    >
      {/* La div intérieure porte le dégradé — transition uniquement sur background */}
      <div
        className="flex items-center gap-3 px-3 py-2 rounded-xl relative overflow-hidden group"
        style={{
          background: gradient,
          transition: 'background 600ms ease',
        }}
      >
        {/* Hover overlay */}
        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 bg-gray-900/5 transition-opacity duration-150 pointer-events-none" />

        {/* Avatar */}
        <div className="relative flex-shrink-0 z-10">
          <div className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center transition-all duration-300 ${!u.isBddBot && !u.isTeamMookup && !showAsOnline ? 'grayscale opacity-40' : ''}`}>
            {u.isBddBot ? (
              <div className="w-full h-full bg-[#6366f1] flex items-center justify-center">
                <img src="/BDDBOT.png" alt="BDD Bot" className="w-full h-full object-contain p-0.5" />
              </div>
            ) : u.isTeamMookup ? (
              <img src="/Logo.png" alt="Team Mookup" className="w-full h-full object-cover" />
            ) : (
              <UserAvatar uid={u.id} photoURL={u.photoURL || null} displayName={u.displayName || u.nickname} size={40} />
            )}
          </div>

          {/* Pastille statut */}
          {!u.isBddBot && !u.isTeamMookup && (
            showAsOnline ? (
              device ? (
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-[16px] h-[16px] bg-white rounded-full flex items-center justify-center shadow border border-gray-100"
                  title={device === 'phone' ? 'Mobile' : 'Ordinateur portable'}
                >
                  {device === 'phone'
                    ? <DeviceMobile size={10} className="text-blue-500" />
                    : <Laptop size={10} className="text-blue-500" />}
                </div>
              ) : null
            ) : (
              <div className="absolute -bottom-0.5 -right-0.5 w-[11px] h-[11px] bg-gray-400 border-2 border-white rounded-full" />
            )
          )}
        </div>

        {/* Pseudo */}
        <span className={`flex-1 min-w-0 text-[14px] font-medium truncate leading-tight z-10 transition-colors duration-300 ${!u.isBddBot && !u.isTeamMookup && !showAsOnline ? 'text-gray-400' : 'text-gray-800'}`} style={{ fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif' }}>
          {name || <span className="text-gray-400 italic text-[13px]">Utilisateur</span>}
        </span>
      </div>
    </div>
  );
});

// ─── Composant principal ──────────────────────────────────────────────────────

export default function MembersPanel({
  isOpen,
  groupId,
  onClose,
  allGroupUsers,
  onlineUsers,
  currentUserId,
  onStartPrivateChat,
}: MembersPanelProps) {
  // Animation state
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  // Detect mobile (SSR-safe)
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      // tiny delay so the initial translate-x-full is painted before we animate in
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // On force toujours l'utilisateur courant dans la liste online :
  // setTyping() écrit dans Firestore mais le snapshot peut arriver avec un léger délai,
  // ce qui ferait basculer l'utilisateur en offline le temps de la resynchronisation.
  const onlineUids = new Set([...onlineUsers.map(u => u.uid), currentUserId]);

  const isTeamMookup = groupId === 'snapchat';
  const officialMember: MemberUser = isTeamMookup
    ? {
        id: 'team-mookup',
        displayName: 'Team Mookup',
        photoURL: '/Logo.png',
        isTeamMookup: true,
      }
    : {
        id: 'bddbot',
        displayName: 'BDD Bot',
        photoURL: '/BDDBOT.png',
        isBddBot: true,
      };

  const regularUsers = isTeamMookup ? [] : allGroupUsers.filter(u => u.id !== 'bddbot');

  const knownIds = new Set(regularUsers.map(u => u.id));
  const presenceOnlyUsers: MemberUser[] = onlineUsers
    .filter(o => o.uid !== 'bddbot' && o.uid !== currentUserId && !knownIds.has(o.uid) && !!o.displayName)
    .map(o => ({ id: o.uid, displayName: o.displayName }));

  const allMembers = [...regularUsers, ...presenceOnlyUsers];

  // Cache stable : ne se recalcule pas quand la liste se réordonne
  const gradientCache = useGradientCache(allMembers);

  const online  = allMembers.filter(u => onlineUids.has(u.id));
  const offline = allMembers.filter(u => !onlineUids.has(u.id));

  const sharedProps = { onlineUsers, currentUserId, onStartPrivateChat, onClose };

  const Section = ({ label, count, children }: { label: string; count: number; children: React.ReactNode }) => (
    <div className="mb-3">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 pt-3 pb-1 select-none" style={{ fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif' }}>
        {label} — {count}
      </p>
      {children}
    </div>
  );

  if (!mounted && !isOpen) return null;

  return (
    <>
      {/* Overlay mobile (fond semi-transparent cliquable pour fermer) */}
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
          // Desktop : comportement inchangé
          'md:relative md:w-80 md:flex-shrink-0 md:top-0 md:bottom-0 md:h-full',
          // Mobile : toute la largeur, remplit tout l'espace disponible (déjà entre header et barre de saisie)
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
            <span className="text-[13px] font-semibold text-gray-600" style={{ fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif' }}>Membres</span>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Fermer"
            >
              <X size={18} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1">
            {/* Membre officiel */}
            <Section label={isTeamMookup ? 'Groupe officiel' : 'Bot officiel de Mookup'} count={1}>
              <MemberRow u={officialMember} gradient={BDD_BOT_GRADIENT} {...sharedProps} />
            </Section>

            {/* En ligne */}
            {online.length > 0 && (
              <Section label="En ligne" count={online.length}>
                {online.map(u => (
                  <MemberRow
                    key={u.id}
                    u={u}
                    gradient={gradientCache[u.id] ?? FALLBACK_GRADIENT}
                    {...sharedProps}
                  />
                ))}
              </Section>
            )}

            {/* Hors ligne */}
            {offline.length > 0 && (
              <Section label="Hors ligne" count={offline.length}>
                {offline.map(u => (
                  <MemberRow
                    key={u.id}
                    u={u}
                    gradient={gradientCache[u.id] ?? FALLBACK_GRADIENT}
                    {...sharedProps}
                  />
                ))}
              </Section>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
