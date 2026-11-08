import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Account deletion',
  description: 'How to request deletion of your Varban Academy account and personal information.',
};

export default function AccountDeletionPage() {
  return (
    <main className="min-h-screen bg-white text-neutral-950">
      <header className="border-b border-neutral-200"><div className="mx-auto max-w-7xl px-5 py-5 sm:px-8"><Link href="/" className="text-lg font-bold tracking-tight">Varban Academy</Link></div></header>
      <article className="mx-auto max-w-4xl px-5 py-14 sm:px-8 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Privacy controls</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Request account deletion</h1>
        <p className="mt-6 text-lg leading-8 text-neutral-600">You can ask us to close your Varban Academy account and delete personal information that we are not required or permitted to retain.</p>
        <section className="mt-12 space-y-4"><h2 className="text-xl font-semibold">How to submit a request</h2><ol className="list-decimal space-y-3 pl-5 text-[15px] leading-7 text-neutral-700"><li>Visit the <Link href="/contact" className="font-semibold underline underline-offset-4">contact page</Link> while signed in, where possible.</li><li>Choose an account or privacy request and state that you want your account deleted.</li><li>Provide the email address associated with the account. Do not send your password, one-time codes or full payment-card details.</li><li>We may ask for proportionate information to verify that you control the account before acting.</li></ol></section>
        <section className="mt-10 space-y-3"><h2 className="text-xl font-semibold">What happens next</h2><p className="text-[15px] leading-7 text-neutral-700">We will acknowledge the request, verify it, and process it within the period required by applicable law. We may ask for clarification if the request is incomplete. We will confirm when the request has been completed or explain any lawful reason why some information must be retained.</p><p className="text-[15px] leading-7 text-neutral-700">Deletion may remove profile details, learning preferences, access credentials and other information linked to your account. Your access to courses, saved progress, certificates, community features or organisation workspaces may end. Consider downloading records you are entitled to keep before requesting deletion.</p></section>
        <section className="mt-10 space-y-3"><h2 className="text-xl font-semibold">Information we may retain</h2><p className="text-[15px] leading-7 text-neutral-700">We may retain limited information where necessary to comply with legal, tax, accounting or regulatory obligations; establish, exercise or defend legal claims; prevent fraud and abuse; maintain security; or honour a transaction. Retained information is restricted to the relevant purpose and deleted or anonymised when no longer needed.</p></section>
        <section className="mt-10 space-y-3"><h2 className="text-xl font-semibold">Requests involving an organisation account</h2><p className="text-[15px] leading-7 text-neutral-700">If your account is managed by an employer, school or other organisation, some enrolment and learning records may be controlled by that organisation. We will explain which requests we can action directly and which must be directed to the organisation administrator.</p></section>
        <section className="mt-10 space-y-3"><h2 className="text-xl font-semibold">Before you submit</h2><p className="text-[15px] leading-7 text-neutral-700">Account deletion is intended to be permanent and may not be reversible. If you only need a break, you may sign out or stop using the service instead. For more information, read our <Link href="/legal/privacy" className="font-semibold underline underline-offset-4">Privacy Notice</Link> and <Link href="/legal/data-safety" className="font-semibold underline underline-offset-4">Data Safety page</Link>.</p></section>
        <div className="mt-12 border-t border-neutral-200 pt-7"><Link href="/contact" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-black px-6 text-sm font-semibold text-white hover:bg-neutral-800">Start a deletion request</Link></div>
      </article>
    </main>
  );
}
