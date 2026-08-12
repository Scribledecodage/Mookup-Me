import Image from 'next/image';
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-[100dvh] flex-col bg-[#f2f3f4] text-gray-900">
      <div className="flex flex-1 items-center justify-center px-6 text-center">
        <div className="flex max-w-md flex-col items-center">
          <Image src="/Logo.png" alt="Mookup" width={64} height={64} className="mb-6 rounded-full" />
          <p className="text-[76px] font-semibold leading-none tracking-tight text-indigo-600">404</p>
          <h1 className="mt-5 text-2xl font-semibold">Page introuvable</h1>
          <p className="mt-2 text-[15px] leading-6 text-gray-500">
            Cette adresse n’existe pas ou la page a été déplacée.
          </p>
          <Link
            href="/"
            className="mt-7 rounded-xl bg-indigo-600 px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            Retourner à l’accueil
          </Link>
        </div>
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
