'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, GraduationCap, ShieldCheck } from 'lucide-react';

const interests = [
  'Financial markets',
  'Forex and trading',
  'Investing and wealth',
  'Professional development',
  'I am exploring',
];

export default function WaitlistPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [interest, setInterest] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setMessage('');
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, interest, website }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'We could not add you right now. Please try again.');
      setStatus('success');
      setMessage('You are on the list. We will be in touch when early access opens.');
      setName('');
      setEmail('');
      setInterest('');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f6f3] text-[#171816]">
      <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col px-5 sm:px-8 lg:px-14">
        <header className="flex h-[78px] items-center justify-between border-b border-black/10">
          <Link href="/" aria-label="Varban Academy" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#171816] text-white"><GraduationCap className="h-[19px] w-[19px]" /></span>
            <span className="text-[15px] font-semibold tracking-[-0.03em]">Varban Academy</span>
          </Link>
          <div className="flex items-center gap-2 text-xs font-medium text-[#656761] sm:gap-5 sm:text-sm">
            <span className="hidden sm:inline">A new standard in financial learning</span>
            <Link href="/login" className="rounded-full border border-black/15 px-4 py-2 text-[#252621] transition hover:bg-white">Sign in</Link>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.05fr_.95fr] lg:gap-20 lg:py-24">
          <div className="max-w-[660px]">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#62645e]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#34362f]" />
              Early access · Applications open
            </div>
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#777970]">Learn with clarity. Move with confidence.</p>
            <h1 className="max-w-[700px] text-[clamp(3.1rem,7.2vw,6.6rem)] font-semibold leading-[.98] tracking-[-0.075em] text-[#171816]">
              Your next chapter in <span className="text-[#85877f]">financial learning</span> starts here.
            </h1>
            <p className="mt-7 max-w-[540px] text-base leading-7 text-[#656761] sm:text-lg sm:leading-8">
              Get first access to Varban Academy — a focused learning experience for understanding financial markets, building practical skills and making more informed decisions.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-black/10 pt-6 text-xs font-medium text-[#62645e]">
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#30322d]" /> Structured learning paths</span>
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#30322d]" /> Practical market education</span>
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#30322d]" /> Early access updates</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[540px]">
            <div className="absolute -inset-5 rounded-[32px] border border-black/[0.045] sm:-inset-7" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-[24px] border border-black/10 bg-white p-6 shadow-[0_24px_80px_rgba(20,22,17,0.07)] sm:p-9">
              <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#888a82]">The first step</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.045em] sm:text-[28px]">Join the waitlist</h2>
                  <p className="mt-2 text-sm leading-6 text-[#777970]">Be among the first to know when enrolment opens.</p>
                </div>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f1f1ed] text-[#30322d]"><ArrowRight className="h-5 w-5" /></span>
              </div>

              {status === 'success' ? (
                <div role="status" aria-live="polite" className="rounded-2xl border border-[#dfe2da] bg-[#f7f8f5] p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e7eae2]"><Check className="h-5 w-5" /></span>
                  <h3 className="mt-4 text-lg font-semibold">You are on the list.</h3>
                  <p className="mt-2 text-sm leading-6 text-[#666960]">{message}</p>
                  <button type="button" onClick={() => { setStatus('idle'); setMessage(''); }} className="mt-5 text-sm font-semibold underline underline-offset-4">Add another person</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="waitlist-name" className="mb-2 block text-xs font-semibold text-[#41433d]">Full name</label>
                    <input id="waitlist-name" name="name" autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" className="h-12 w-full rounded-xl border border-[#dedfd9] bg-white px-4 text-sm outline-none transition placeholder:text-[#a0a198] focus:border-[#777970] focus:ring-2 focus:ring-black/5" />
                  </div>
                  <div>
                    <label htmlFor="waitlist-email" className="mb-2 block text-xs font-semibold text-[#41433d]">Email address</label>
                    <input id="waitlist-email" name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="h-12 w-full rounded-xl border border-[#dedfd9] bg-white px-4 text-sm outline-none transition placeholder:text-[#a0a198] focus:border-[#777970] focus:ring-2 focus:ring-black/5" />
                  </div>
                  <div>
                    <label htmlFor="waitlist-interest" className="mb-2 block text-xs font-semibold text-[#41433d]">What are you interested in? <span className="font-normal text-[#92948c]">(optional)</span></label>
                    <select id="waitlist-interest" name="interest" value={interest} onChange={(event) => setInterest(event.target.value)} className="h-12 w-full rounded-xl border border-[#dedfd9] bg-white px-4 text-sm text-[#454740] outline-none transition focus:border-[#777970] focus:ring-2 focus:ring-black/5">
                      <option value="">Select an area</option>
                      {interests.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                  <div className="hidden" aria-hidden="true">
                    <label htmlFor="waitlist-website">Website</label>
                    <input id="waitlist-website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
                  </div>
                  {status === 'error' && <p role="alert" className="rounded-lg bg-[#f4f4f1] px-3 py-2.5 text-sm text-[#42443d]">{message}</p>}
                  <button type="submit" disabled={status === 'submitting'} className="flex h-13 min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#1c1d19] px-5 text-sm font-semibold text-white transition hover:bg-[#363831] disabled:cursor-not-allowed disabled:opacity-60">
                    {status === 'submitting' ? 'Adding you…' : 'Join the waitlist'} <ArrowRight className="h-4 w-4" />
                  </button>
                  <p className="flex items-start gap-2 text-[11px] leading-5 text-[#898b83]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> Your details are used only for Varban Academy launch updates. No spam, and you can opt out at any time.</p>
                </form>
              )}
            </div>
            <p className="mt-5 text-center text-[11px] text-[#85877f]">A considered approach to learning. No promises of financial returns.</p>
          </div>
        </section>

        <footer className="flex flex-col gap-3 border-t border-black/10 py-6 text-[11px] text-[#85877f] sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Varban Academy. All rights reserved.</span>
          <div className="flex items-center gap-5"><Link href="/privacy" className="transition hover:text-black">Privacy</Link><Link href="/terms" className="transition hover:text-black">Terms</Link><Link href="/contact" className="transition hover:text-black">Contact</Link></div>
        </footer>
      </div>
    </main>
  );
}
