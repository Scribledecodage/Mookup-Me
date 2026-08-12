'use client';

import React, { useState } from 'react';
import { ChartLineUp, House, SquaresFour } from '@phosphor-icons/react';

export type BotSection = 'accueil' | 'applications' | 'statistiques';

const NAV_ITEMS: { id: BotSection; label: string; description: string; icon: React.ElementType }[] = [
  { id: 'accueil', label: 'Accueil', description: 'Découvrir et installer des bots', icon: House },
  { id: 'applications', label: 'Applications', description: 'Créer et gérer tes bots', icon: SquaresFour },
  { id: 'statistiques', label: 'Statistiques', description: 'Suivre l’activité de tes bots', icon: ChartLineUp },
];

interface BotViewProps {
  activeSection?: BotSection;
  onSelectSection?: (section: BotSection) => void;
  onMobileNavigate?: (section: BotSection) => void;
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
    <div className="sidebar-panel flex h-full w-full flex-col bg-white">
      <div className="flex flex-col gap-0.5 overflow-y-auto px-2 py-3">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = !hideActiveStyle && active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleClick(item.id)}
              className={`sidebar-item w-full cursor-pointer flex items-center gap-4 rounded-xl px-4 py-3 text-left transition-all ${isActive ? 'sidebar-item-selected bg-gray-200' : 'hover:bg-gray-100 active:bg-gray-200'}`}
            >
              <div className={`sidebar-item-icon flex h-6 w-6 flex-shrink-0 items-center justify-center ${isActive ? 'text-gray-700' : 'text-gray-500'}`}>
                <Icon size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <span className={`block text-[15px] leading-tight ${isActive ? 'font-medium text-gray-900' : 'font-normal text-gray-800'}`} style={{ fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif' }}>{item.label}</span>
                <span className="block truncate text-[13px] text-gray-500">{item.description}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
