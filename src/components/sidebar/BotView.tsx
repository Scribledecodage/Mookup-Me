'use client';

import React, { useState } from 'react';
import { House, SquaresFour, Users, Bug } from '@phosphor-icons/react';

export type BotSection = 'accueil' | 'applications' | 'serveurs' | 'debug';

const NAV_ITEMS: { id: BotSection; label: string; icon: React.ElementType }[] = [
  { id: 'accueil',       label: 'Accueil',                  icon: House },
  { id: 'applications',  label: 'Applications',             icon: SquaresFour },
  { id: 'serveurs',      label: 'Groupes',                  icon: Users },
  { id: 'debug',         label: "Débogage d'intégration",   icon: Bug },
];

interface BotViewProps {
  activeSection?: BotSection;
  onSelectSection?: (section: BotSection) => void;
  /** Appelé sur mobile quand l'utilisateur clique un item — ouvre la page de contenu */
  onMobileNavigate?: (section: BotSection) => void;
  /** Si true, désactive la mise en évidence de l'item actif (sur mobile) */
  hideActiveStyle?: boolean;
}

export default function BotView({ activeSection = 'accueil', onSelectSection, onMobileNavigate, hideActiveStyle = false }: BotViewProps) {
  const [localActive, setLocalActive] = useState<BotSection>(activeSection);

  const active = onSelectSection ? activeSection : localActive;

  const handleClick = (id: BotSection) => {
    if (onSelectSection) onSelectSection(id);
    else setLocalActive(id);
    onMobileNavigate?.(id);
  };

  return (
    <div className="flex flex-col bg-white w-full">
      <div className="py-3 px-2 flex flex-col gap-0.5">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = !hideActiveStyle && active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleClick(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all text-[15px] cursor-pointer ${
                isActive
                  ? 'bg-gray-200 text-gray-900 font-medium'
                  : 'text-gray-600 hover:bg-gray-100 active:bg-gray-200 font-normal'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-gray-700' : 'text-gray-500'} />
              <span className="leading-tight" style={{ fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif' }}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
