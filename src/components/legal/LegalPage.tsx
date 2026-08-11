'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CaretLeft, Cookie, Scales, ShieldCheck } from '@phosphor-icons/react';
import { LEGAL_CONTENT, LEGAL_NOTE } from '@/lib/legalContent';
import type { LegalKind } from '@/lib/legalContent';

const LEGAL_ICONS = {
  'conditions-utilisation': Scales,
  confidentialite: ShieldCheck,
  cookies: Cookie,
};

interface LegalPageProps {
  kind: LegalKind;
}

export default function LegalPage({ kind }: LegalPageProps) {
  const router = useRouter();
  const page = LEGAL_CONTENT[kind];
  const Icon = LEGAL_ICONS[kind];

  const handleBack = () => {
    const from = new URLSearchParams(window.location.search).get('from');
    router.push(from === 'inscription' ? '/inscription' : '/');
  };

  return (
    <main className="min-h-screen bg-[#f4f5f7] text-[#202124]">
      <header className="bg-[#5046e5] text-white">
        <div className="flex w-full items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link href="/" className="inline-flex min-w-0 items-center gap-2.5" aria-label="Mookup">
            <Image src="/Logo.png" alt="Mookup" width={32} height={32} />
            <span className="truncate text-[18px] font-extrabold tracking-wide">Mookup</span>
          </Link>
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex flex-shrink-0 items-center gap-2 rounded-lg px-2 py-2 text-[14px] font-medium transition-colors hover:bg-white/15"
          >
            <CaretLeft size={20} />
            <span className="hidden sm:inline">Retour à l’authentification</span>
            <span className="sm:hidden">Retour</span>
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-16">
        <div className="mb-6 flex min-w-0 items-start gap-3 sm:gap-4">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[#5046e5]/10 text-[#5046e5] sm:h-12 sm:w-12">
            <Icon size={24} weight="duotone" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">{page.title}</h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-7 text-gray-600">{page.intro}</p>
          </div>
        </div>

        <div className="space-y-3">
          {page.sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-[16px] font-semibold text-gray-900">{section.title}</h2>
              <p className="mt-2 text-[14px] leading-7 text-gray-600">{section.text}</p>
            </section>
          ))}
        </div>

        <p className="mt-6 text-[12px] leading-5 text-gray-400">{LEGAL_NOTE}</p>
      </div>

      <footer className="bg-[#1a1a1a] px-5 py-6 text-center text-[12px] text-[#787c84]">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <Link href="/politique-confidentialite" className="transition-colors hover:text-white">Politique de confidentialité</Link>
          <Link href="/conditions-utilisation" className="transition-colors hover:text-white">Conditions d’utilisation</Link>
          <Link href="/cookies" className="transition-colors hover:text-white">Cookies</Link>
          <span>© {new Date().getFullYear()} Mookup. Tous droits réservés.</span>
        </div>
      </footer>
    </main>
  );
}
