'use client';

import Link from 'next/link';

const groups = [
  { title: 'Learn', links: [['Courses and programs', '/programs'], ['Bootcamps', '/bootcamps'], ['Insights and guides', '/blog'], ['Live learning', '/live']] },
  { title: 'Varban Academy', links: [['About us', '/about'], ['For organisations', '/for-business'], ['Contact', '/contact'], ['Help centre', '/help']] },
  { title: 'Legal and privacy', links: [['Terms and agreements', '/legal/terms'], ['Privacy notice', '/legal/privacy'], ['How we use your data', '/legal/data-use'], ['Data safety', '/legal/data-safety'], ['Legal information', '/legal/legal'], ['Account deletion', '/account-deletion']] },
];

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white text-neutral-950">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-16">
        <div className="grid gap-10 border-b border-neutral-200 pb-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <Link href="/" className="text-xl font-bold tracking-tight">Varban Academy</Link>
            <p className="mt-4 text-sm leading-6 text-neutral-600">Practical learning for people building knowledge, skills and confidence for a changing world.</p>
          </div>
          {groups.map((group) => (
            <div key={group.title}>
              <h2 className="text-sm font-semibold">{group.title}</h2>
              <ul className="mt-4 space-y-3 text-sm text-neutral-600">
                {group.links.map(([label, href]) => <li key={href}><Link href={href} className="transition hover:text-black">{label}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 pt-6 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Varban Academy. All rights reserved.</p>
          <p>Educational content only. Learning outcomes are not guaranteed.</p>
        </div>
      </div>
    </footer>
  );
}
