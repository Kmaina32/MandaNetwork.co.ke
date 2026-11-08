'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white text-neutral-950">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <div className="flex flex-col gap-5 border-b border-neutral-200 pb-8 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight">Varban Academy</Link>
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-neutral-600">
            <Link href="/legal/terms" className="hover:text-black">Terms and agreements</Link>
            <Link href="/legal/privacy" className="hover:text-black">Privacy notice</Link>
            <Link href="/legal/data-use" className="hover:text-black">How we use your data</Link>
            <Link href="/legal/data-safety" className="hover:text-black">Data safety</Link>
            <Link href="/account-deletion" className="hover:text-black">Account deletion</Link>
          </nav>
        </div>
        <p className="pt-6 text-xs text-neutral-500">© {new Date().getFullYear()} Varban Academy. All rights reserved.</p>
      </div>
    </footer>
  );
}
