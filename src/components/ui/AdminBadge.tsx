'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck } from '@phosphor-icons/react';

type PopupPosition = {
  top: number;
  left: number;
  width: number;
  transform: string;
};

export default function AdminBadge() {
  const [isOpen, setIsOpen] = useState(false);
  const [popupPosition, setPopupPosition] = useState<PopupPosition | null>(null);
  const badgeRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const updatePopupPosition = () => {
      const badge = badgeRef.current;
      if (!badge) return;

      const rect = badge.getBoundingClientRect();
      const popupWidth = Math.min(224, Math.max(0, window.innerWidth - 16));
      const gap = 8;
      const estimatedHeight = 82;
      const left = Math.min(
        Math.max(8, rect.left + rect.width / 2 - popupWidth / 2),
        Math.max(8, window.innerWidth - popupWidth - 8),
      );
      const opensAbove = rect.top >= estimatedHeight + gap + 8;

      setPopupPosition({
        top: opensAbove ? rect.top - gap : rect.bottom + gap,
        left,
        width: popupWidth,
        transform: opensAbove ? 'translateY(-100%)' : 'none',
      });
    };

    updatePopupPosition();
    window.addEventListener('resize', updatePopupPosition);
    window.addEventListener('scroll', updatePopupPosition, true);
    return () => {
      window.removeEventListener('resize', updatePopupPosition);
      window.removeEventListener('scroll', updatePopupPosition, true);
    };
  }, [isOpen]);

  return (
    <span
      ref={badgeRef}
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen(previous => !previous);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-indigo-600 transition-colors hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        aria-label="Informations sur le badge administrateur"
        aria-expanded={isOpen}
      >
        <ShieldCheck size={16} weight="fill" />
      </button>
      {isOpen && (
        <span
          role="tooltip"
          style={popupPosition ? {
            position: 'fixed',
            top: popupPosition.top,
            left: popupPosition.left,
            width: popupPosition.width,
            transform: popupPosition.transform,
            visibility: 'visible',
          } : { visibility: 'hidden' }}
          className="z-50 rounded-xl border border-gray-100 bg-white p-3 text-left shadow-[0_8px_24px_rgba(0,0,0,0.14)]"
        >
          <span className="block text-[13px] font-semibold text-gray-900">Administrateur Mookup</span>
          <span className="mt-1 block text-[12px] leading-relaxed text-gray-500">Compte autorisé à accéder à l’administration du site.</span>
        </span>
      )}
    </span>
  );
}
