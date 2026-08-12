'use client';

import { useEffect, useState } from 'react';
import { Check, CheckCircle, Info, Moon, Monitor, Palette, Sun } from '@phosphor-icons/react';
import { applyThemePreference, isThemePreference, THEME_STORAGE_KEY } from '@/components/ThemeManager';

const THEME_OPTIONS = [
  {
    value: 'light',
    label: 'Clair',
    description: 'Une interface lumineuse et épurée.',
    icon: Sun,
    previewClass: 'bg-white text-gray-800',
    panelClass: 'bg-gray-100',
  },
  {
    value: 'dark',
    label: 'Sombre',
    description: 'Un contraste doux pour les yeux.',
    icon: Moon,
    previewClass: 'bg-[#171a21] text-white',
    panelClass: 'bg-[#2d3440]',
  },
  {
    value: 'system',
    label: 'Automatique',
    description: 'Un aperçu selon le réglage de votre appareil.',
    icon: Monitor,
    previewClass: 'bg-gradient-to-r from-white to-[#171a21] text-gray-800',
    panelClass: 'bg-black/10',
  },
];

export default function AppearancePage() {
  const [selectedTheme, setSelectedTheme] = useState('system');

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemePreference(storedTheme)) setSelectedTheme(storedTheme);
  }, []);

  const selectTheme = (nextTheme) => {
    if (!isThemePreference(nextTheme)) return;
    setSelectedTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyThemePreference(nextTheme);
  };

  const selectedOption = THEME_OPTIONS.find(option => option.value === selectedTheme) || THEME_OPTIONS[2];
  const PreviewIcon = selectedOption.icon;

  return (
    <div className="w-full max-w-lg p-6 pb-12">
      <div className="mb-6">
        <h2 className="mb-1 text-2xl font-semibold text-gray-900">Apparence</h2>
        <p className="text-[15px] text-gray-500">Choisissez le thème utilisé dans toute l’application Mookup.</p>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <Palette size={23} className="flex-shrink-0 text-blue-500" />
          <div>
            <h3 className="text-[15px] font-semibold text-gray-900">Thème</h3>
            <p className="mt-1 text-[13px] text-gray-500">Le changement est appliqué immédiatement à toute l’application et conservé sur cet appareil.</p>
          </div>
        </div>

        <div className="space-y-3" role="radiogroup" aria-label="Choisir un thème">
          {THEME_OPTIONS.map(option => {
            const Icon = option.icon;
            const isSelected = selectedTheme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => selectTheme(option.value)}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${isSelected
                  ? option.value === 'dark'
                    ? 'border-[#454b59] bg-[#242832] text-white'
                    : 'border-blue-500 bg-blue-50/60'
                  : 'border-gray-200 bg-gray-50 hover:border-blue-200 hover:bg-blue-50/30'}`}
              >
                <div className={`flex h-12 w-16 flex-shrink-0 items-end gap-1 overflow-hidden rounded-lg border border-gray-200 p-2 ${option.previewClass}`} aria-hidden="true">
                  <span className={`h-5 w-2 rounded-sm ${option.panelClass}`} />
                  <span className={`h-7 flex-1 rounded-sm ${option.panelClass}`} />
                  <span className={`h-3 w-3 rounded-full ${option.panelClass}`} />
                </div>
                <span className="min-w-0 flex-1">
                  <span className={`flex items-center gap-2 text-[14px] font-semibold ${isSelected && option.value === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    <Icon size={17} className={isSelected && option.value === 'dark' ? 'text-blue-300' : 'text-blue-500'} />
                    {option.label}
                  </span>
                  <span className={`mt-1 block text-[12px] ${isSelected && option.value === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>{option.description}</span>
                </span>
                <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border ${isSelected ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300 text-transparent'}`} aria-hidden="true">
                  {isSelected && <Check size={15} weight="bold" />}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className={`mt-4 overflow-hidden rounded-2xl border border-gray-200 shadow-sm ${selectedOption.previewClass}`} aria-label={`Aperçu du thème ${selectedOption.label}`}>
        <div className={`flex items-center gap-2 border-b border-black/10 px-4 py-3 ${selectedOption.panelClass}`}>
          <PreviewIcon size={19} />
          <span className="text-[13px] font-semibold">Aperçu · {selectedOption.label}</span>
        </div>
        <div className="space-y-3 p-4">
          <div className={`h-3 w-2/3 rounded-full ${selectedOption.panelClass}`} />
          <div className={`h-3 w-5/6 rounded-full ${selectedOption.panelClass}`} />
          <div className="flex gap-2 pt-2">
            <div className={`h-10 flex-1 rounded-xl ${selectedOption.panelClass}`} />
            <div className={`h-10 flex-1 rounded-xl ${selectedOption.panelClass}`} />
          </div>
        </div>
      </section>

      <div className="mt-4 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <Info size={22} className="mt-0.5 flex-shrink-0 text-blue-500" />
        <div>
          <p className="flex items-center gap-2 text-[14px] font-semibold text-blue-800"><CheckCircle size={17} /> Thème appliqué</p>
          <p className="mt-1 text-[12px] leading-5 text-blue-700">Le thème choisi est maintenant utilisé dans toute l’application Mookup.</p>
        </div>
      </div>
    </div>
  );
}
