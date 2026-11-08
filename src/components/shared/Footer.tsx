'use client';

import Link from 'next/link';

const groups = [
  { title: 'Learn', links: [['Courses and programs', '/programs'], ['Bootcamps', '/bootcamps'], ['Insights and guides', '/blog'], ['Live learning', '/live']] },
  { title: 'Varban Academy', links: [['About us', '/about'], ['For organisations', '/for-business'], ['Contact', '/contact'], ['Help centre', '/help']] },
  { title: 'Legal and privacy', links: [['Terms and agreements', '/legal/terms'], ['Risk disclosure', '/legal/risk-disclosure'], ['Privacy notice', '/legal/privacy'], ['How we use your data', '/legal/data-use'], ['Data safety', '/legal/data-safety'], ['Account deletion', '/account-deletion']] },
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
          {groups.map((group) => <div key={group.title}><h2 className="text-sm font-semibold">{group.title}</h2><ul className="mt-4 space-y-3 text-sm text-neutral-600">{group.links.map(([label, href]) => <li key={href}><Link href={href} className="transition hover:text-black">{label}</Link></li>)}</ul></div>)}
        </div>
        <section aria-labelledby="academy-disclosures" className="border-b border-neutral-200 py-8 text-[13px] leading-6 text-neutral-600">
          <h2 id="academy-disclosures" className="mb-4 text-sm font-semibold text-neutral-900">Important information and risk disclosure</h2>
          <p className="mb-3">The information on Varban Academy is provided for educational and informational purposes only. It is not financial, investment, legal, tax or other professional advice, and it is not a recommendation, offer or solicitation to buy or sell any financial product. Information may become outdated or may not be suitable for your circumstances. Conduct your own research and seek independent advice before making financial decisions.</p>
          <p className="mb-3">Demo accounts, simulations and practice environments are for learning and strategy testing only. Results achieved in a simulated environment do not guarantee similar results in live markets. Live trading involves additional risks, including emotional decision-making, liquidity, slippage, execution differences and the possibility of losing some or all of the capital committed.</p>
          <p className="mb-3">Trading in derivatives, contracts for difference (CFDs), synthetic contracts and leveraged products can be complex and carries a high risk of loss. Leverage can magnify both gains and losses. You should understand how a product works, assess your financial position and risk tolerance, and never trade with money you cannot afford to lose.</p>
          <p className="mb-3">This website may use automated translation tools for convenience. The English-language version is the reference version for interpreting the website content, subject to mandatory rights under applicable law.</p>
          <p className="mb-3">Varban Academy is an education platform. Its educational content does not, by itself, constitute a regulated brokerage, investment, portfolio-management or payment service. Any regulated service, if offered, will be provided only by the specifically identified legal entity under the authorisations applicable to that service and jurisdiction.</p>
          <p className="mb-3">Services may not be available to residents of certain countries or territories where access would be unlawful or where the relevant service is not authorised. Restrictions may change. Users are responsible for checking local laws and the eligibility terms applicable to them.</p>
          <p className="mb-3">Content, course materials, graphics and other original materials on this website may not be copied, republished, redistributed or commercially exploited without prior written permission, except where permitted by law.</p>
          <p className="mb-3">Personal information is handled in accordance with our <Link href="/legal/privacy" className="font-semibold text-neutral-900 underline underline-offset-2">Privacy Notice</Link> and <Link href="/legal/data-safety" className="font-semibold text-neutral-900 underline underline-offset-2">Data Safety statement</Link>. Payment card processing, where available, is performed by the relevant payment provider. We do not claim PCI DSS certification or ISO/IEC 27001 certification unless the applicable certification and scope have been independently verified.</p>
          <p className="font-medium text-neutral-800">Please read our <Link href="/legal/terms" className="underline underline-offset-2">Terms and Agreements</Link>, <Link href="/legal/risk-disclosure" className="underline underline-offset-2">Risk Disclosure</Link> and <Link href="/legal/data-safety" className="underline underline-offset-2">Data Safety</Link> information before using the platform.</p>
        </section>
        <div className="flex flex-col gap-2 pt-6 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between"><p>© {new Date().getFullYear()} Varban Academy. All rights reserved.</p><p>Educational content only. Learning outcomes are not guaranteed.</p></div>
      </div>
    </footer>
  );
}
