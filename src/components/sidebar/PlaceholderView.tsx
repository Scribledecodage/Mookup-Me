'use client';

import React from 'react';
import { ChatCircle, type Icon } from '@phosphor-icons/react';

interface PlaceholderViewProps {
  icon?: Icon;
}

export default function PlaceholderView({ icon: Icon = ChatCircle }: PlaceholderViewProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-400">
      <div className="p-4 bg-gray-50 rounded-full mb-4">
        <Icon size={48} className="opacity-20" />
      </div>
      <p className="text-sm">Cette section sera bientôt disponible !</p>
    </div>
  );
}
