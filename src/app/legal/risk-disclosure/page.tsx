import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Risk disclosure',
  description: 'Important risks associated with financial markets, derivatives, leveraged products and simulated trading.',
};

const sections = [
  ['Educational content only', 'Varban Academy provides educational and informational material. Nothing on this website is personal financial, investment, legal, tax or other professional advice, nor a recommendation, offer or solicitation to enter any transaction. Content may become outdated, incomplete or inaccurate as markets and regulations change. Conduct your own research and seek independent advice before making decisions.'],
  ['Derivatives and leveraged products', 'Derivatives, contracts for difference (CFDs), synthetic contracts, options, foreign exchange and other leveraged products are complex and may not be suitable for all participants. Leverage magnifies market exposure and can magnify losses. You may lose some or all of the funds committed, and in some circumstances losses may exceed an initial amount depending on the product and contractual terms. Understand the product documentation before participating.'],
  ['Market and execution risk', 'Prices can move rapidly and unpredictably. Liquidity, volatility, spreads, slippage, gaps, outages, delays, pricing sources and order execution may affect outcomes. Stop-loss or other risk controls may not always execute at the requested price or prevent losses. Past performance, historical examples and forecasts are not reliable indicators of future results.'],
  ['Demo and simulated results', 'Demo accounts and simulations are designed for practice and strategy testing. They may not reproduce live-market liquidity, execution, fees, market impact, available products or the psychological pressures of trading real money. Success in a simulated environment does not guarantee success in a live environment.'],
  ['Personal responsibility and suitability', 'Consider your financial objectives, experience, knowledge, financial resources and tolerance for loss. Do not trade with money needed for essential living expenses or funds you cannot afford to lose. If you do not understand a product or its risks, do not use it until you have obtained appropriate independent guidance.'],
  ['No guarantee', 'Examples, tutorials, strategies, indicators, opinions and educational demonstrations are provided for learning. We make no promise of profit, accuracy, availability, suitability or a particular outcome. You remain solely responsible for decisions and actions taken based on information you access.'],
  ['Geographic restrictions and regulatory status', 'Products and services may be restricted or unavailable in certain jurisdictions. You are responsible for checking whether access is lawful where you reside. Varban Academy’s educational service should not be confused with a brokerage or other regulated financial service. Any regulated service must identify the exact legal entity, current licence, regulator, authorised activities and applicable client protections.'],
  ['Contact', 'If you have questions about this risk disclosure, contact us through the website contact page. This disclosure should be read together with the Terms and Agreements and Privacy Notice.']
];

export default function RiskDisclosurePage() {
  return (
    <main className="min-h-screen bg-white text-neutral-950">
      <header className="border-b border-neutral-200"><div className="mx-auto max-w-7xl px-5 py-5 sm:px-8"><Link href="/" className="text-lg font-bold tracking-tight">Varban Academy</Link></div></header>
      <article className="mx-auto max-w-4xl px-5 py-14 sm:px-8 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Varban Academy · Important information</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Risk disclosure</h1>
        <p className="mt-6 text-lg leading-8 text-neutral-600">Please read this information carefully before using market-related learning materials, simulations or any linked third-party trading service.</p>
        <p className="mt-5 text-xs text-neutral-500">Effective date: 8 November 2026</p>
        <div className="mt-12 space-y-9">{sections.map(([title, body]) => <section key={title}><h2 className="text-xl font-semibold">{title}</h2><p className="mt-3 text-[15px] leading-7 text-neutral-700">{body}</p></section>)}</div>
        <div className="mt-14 border-t border-neutral-200 pt-8 text-sm text-neutral-600">Also read our <Link href="/legal/terms" className="font-semibold underline underline-offset-4">Terms and Agreements</Link> and <Link href="/legal/legal" className="font-semibold underline underline-offset-4">Legal Information</Link>.</div>
      </article>
    </main>
  );
}
