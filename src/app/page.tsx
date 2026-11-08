'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BookOpen, ChartNoAxesCombined, GraduationCap, Menu, PlayCircle, Search, Video, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { getAllCourses, getAllBlogPosts } from '@/lib/firebase-service';
import type { Course } from '@/lib/mock-data';
import type { BlogPost } from '@/lib/types';
import { slugify } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { LoadingAnimation } from '@/components/LoadingAnimation';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1600&q=85';
const LEARNING_IMAGE = 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?auto=format&fit=crop&w=1100&q=85';
const ANALYSIS_IMAGE = 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=85';

function SectionHeading({ eyebrow, title, description, href, linkLabel = 'View all' }: {
  eyebrow?: string; title: string; description?: string; href?: string; linkLabel?: string;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">{eyebrow}</p>}
        <h2 className="text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">{title}</h2>
        {description && <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-600 sm:text-base">{description}</p>}
      </div>
      {href && <Link href={href} className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-neutral-900 transition hover:gap-3">{linkLabel}<ArrowRight className="h-4 w-4" /></Link>}
    </div>
  );
}

export default function Home() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    router.replace(isAdmin ? '/admin' : '/dashboard');
  }, [authLoading, user, isAdmin, router]);

  useEffect(() => {
    let active = true;
    const loadLandingContent = async () => {
      setLoading(true);
      const [courseResult, postResult] = await Promise.allSettled([getAllCourses(), getAllBlogPosts()]);
      if (!active) return;
      if (courseResult.status === 'fulfilled') setCourses(Array.isArray(courseResult.value) ? courseResult.value : []);
      else console.error('Unable to load academy courses', courseResult.reason);
      if (postResult.status === 'fulfilled') {
        setPosts((Array.isArray(postResult.value) ? postResult.value : []).filter((post) => post.isPublished).slice(0, 3));
      } else console.error('Unable to load academy articles', postResult.reason);
      setLoading(false);
    };
    loadLandingContent();
    return () => { active = false; };
  }, []);

  const featuredCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return courses.filter((course) => !query || [course.title, course.category, course.description].some((value) => String(value || '').toLowerCase().includes(query))).slice(0, 3);
  }, [courses, searchQuery]);

  if (authLoading || user) {
    return <div className="flex min-h-screen items-center justify-center bg-white"><LoadingAnimation /></div>;
  }

  return (
    <div className="min-h-screen overflow-hidden bg-white text-neutral-950">
      <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Varban Academy home">
            
            <span className="text-base font-bold tracking-tight sm:text-lg">Varban Academy</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
            <Link className="text-sm font-medium text-neutral-600 transition hover:text-black" href="#courses">Courses</Link>
            <Link className="text-sm font-medium text-neutral-600 transition hover:text-black" href="#resources">Learning resources</Link>
            <Link className="text-sm font-medium text-neutral-600 transition hover:text-black" href="/programs">Programs</Link>
            <Link className="text-sm font-medium text-neutral-600 transition hover:text-black" href="/blog">Insights</Link>
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <Link href="/login" className="rounded-lg px-4 py-2.5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100">Log in</Link>
            <Link href="/signup" className="rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800">Get started</Link>
          </div>
          <button type="button" onClick={() => setMobileMenuOpen((open) => !open)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 md:hidden" aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileMenuOpen}>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <nav className="border-t border-neutral-200 bg-white px-5 py-4 md:hidden" aria-label="Mobile navigation">
            <div className="flex flex-col gap-1">
              {[['Courses', '#courses'], ['Learning resources', '#resources'], ['Programs', '/programs'], ['Insights', '/blog'], ['Log in', '/login'], ['Get started', '/signup']].map(([label, href]) => (
                <Link key={label} href={href} onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-3 text-sm font-medium text-neutral-800 hover:bg-neutral-100">{label}</Link>
              ))}
            </div>
          </nav>
        )}
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-5 pb-14 pt-10 sm:px-8 sm:pb-20 sm:pt-14 lg:pt-16">
          <div className="grid items-center gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14">
            <div className="max-w-xl">
              <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Varban Academy · Financial education</p>
              <h1 className="text-[2.7rem] font-semibold leading-[1.06] tracking-[-0.055em] text-black sm:text-6xl lg:text-[4.25rem]">
                Know more.<br />Trade better.
              </h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-neutral-600 sm:text-lg sm:leading-8">
                Build your understanding of financial markets with practical courses, guided lessons and learning resources designed to help you make more informed decisions.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/programs" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-black px-6 text-sm font-semibold text-white transition hover:bg-neutral-800">Explore courses <ArrowRight className="h-4 w-4" /></Link>
                <Link href="/blog" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-neutral-300 bg-white px-6 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50">Browse learning resources</Link>
              </div>
              <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-neutral-200 pt-6 text-xs font-medium text-neutral-500">
                <span className="inline-flex items-center gap-2"><BookOpen className="h-4 w-4 text-neutral-800" /> Structured learning</span>
                <span className="inline-flex items-center gap-2"><Video className="h-4 w-4 text-neutral-800" /> Practical lessons</span>
                <span className="inline-flex items-center gap-2"><ChartNoAxesCombined className="h-4 w-4 text-neutral-800" /> Market knowledge</span>
              </div>
            </div>
            <div className="relative">
              <div className="relative aspect-[1.22/1] overflow-hidden rounded-2xl bg-neutral-100 sm:aspect-[1.3/1]">
                <Image src={HERO_IMAGE} alt="Financial market charts displayed on a trading workstation" fill priority sizes="(max-width: 1024px) 100vw, 55vw" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-tr from-black/35 via-transparent to-transparent" />
              </div>
              <div className="absolute -bottom-5 left-4 max-w-[230px] border-l-2 border-black bg-white/95 py-2 pl-4 pr-2 shadow-sm sm:-left-6 sm:bottom-7">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Your learning journey</p>
                <p className="mt-1 text-sm font-semibold text-neutral-950">Start with the foundations.</p>
                <Link href="/programs" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-neutral-800">Find your starting point <ArrowRight className="h-3.5 w-3.5" /></Link>
              </div>
              <div className="absolute -right-2 top-5 hidden w-36 border-l-2 border-black bg-white/95 p-3 shadow-sm backdrop-blur sm:block">
                <ChartNoAxesCombined className="h-5 w-5 text-black" />
                <p className="mt-2 text-[10px] font-semibold leading-4 text-neutral-700">Learn at your own pace</p>
              </div>
            </div>
          </div>
        </section>

        <section id="courses" className="scroll-mt-24 border-y border-neutral-100 bg-neutral-50/80 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <SectionHeading eyebrow="Build your knowledge" title="Courses for every stage of your journey" description="Explore structured learning designed to help you understand the markets, develop your skills and build confidence step by step." href="/programs" linkLabel="Explore all courses" />
            <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-neutral-500">A selection from the Varban Academy catalogue</p>
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input aria-label="Search courses" type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search courses..." className="h-11 w-full rounded-lg border border-neutral-200 bg-white pl-10 pr-4 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-500" />
              </div>
            </div>
            {loading ? (
              <div className="flex justify-center py-16"><LoadingAnimation /></div>
            ) : featuredCourses.length > 0 ? (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {featuredCourses.map((course) => (
                  <Link key={course.id} href={`/courses/${slugify(course.title)}`} className="group overflow-hidden rounded-xl border border-neutral-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-xl">
                    <div className="relative aspect-[1.65/1] overflow-hidden bg-neutral-100">
                      <Image src={course.imageUrl || LEARNING_IMAGE} alt={course.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition duration-500 group-hover:scale-[1.04]" />
                      <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-800">{course.category || 'Course'}</span>
                    </div>
                    <div className="p-5">
                      <h3 className="text-lg font-semibold tracking-tight text-neutral-950">{course.title}</h3>
                      <p className="mt-2 line-clamp-2 min-h-12 text-sm leading-6 text-neutral-600">{course.description}</p>
                      <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-4">
                        <span className="text-sm font-semibold text-neutral-950">{course.price > 0 ? `Ksh ${course.price.toLocaleString()}` : 'Free'}</span>
                        <span className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-800">View course <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-12 text-center">
                <GraduationCap className="mx-auto h-8 w-8 text-neutral-400" />
                <p className="mt-3 text-sm font-semibold text-neutral-900">{searchQuery ? 'No matching courses found' : 'New courses are on the way'}</p>
                <p className="mt-1 text-sm text-neutral-500">{searchQuery ? 'Try a different search term.' : 'Explore our programs and check back for new learning opportunities.'}</p>
                <Link href="/programs" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-neutral-900">Browse programs <ArrowRight className="h-4 w-4" /></Link>
              </div>
            )}
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-2 lg:gap-16">
          <div className="relative order-2 lg:order-1">
            <div className="relative aspect-[1.25/1] overflow-hidden rounded-2xl bg-neutral-100">
              <Image src={LEARNING_IMAGE} alt="A detailed financial trading chart used for market analysis" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
            </div>
            <div className="absolute -bottom-4 -right-2 w-44 rounded-xl border border-neutral-200 bg-white p-4 shadow-lg sm:-right-5">
              <p className="text-xs font-semibold text-neutral-950">Learn the process</p>
              <p className="mt-1 text-xs leading-5 text-neutral-500">Understand concepts before putting them into practice.</p>
            </div>
          </div>
          <div className="order-1 max-w-xl lg:order-2">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Learning that makes sense</p>
            <h2 className="text-3xl font-semibold leading-tight tracking-tight text-neutral-950 sm:text-4xl">Build a stronger foundation before you trade.</h2>
            <p className="mt-5 text-base leading-7 text-neutral-600">Move from the basics to more advanced market concepts through clear explanations and structured learning. Take your time, revisit lessons and develop your understanding at your own pace.</p>
            <div className="mt-7 space-y-4">
              <div className="flex gap-3"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold">1</span><div><p className="text-sm font-semibold text-neutral-900">Understand the fundamentals</p><p className="mt-1 text-sm text-neutral-500">Learn terminology, market structure and essential concepts.</p></div></div>
              <div className="flex gap-3"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold">2</span><div><p className="text-sm font-semibold text-neutral-900">Develop practical skills</p><p className="mt-1 text-sm text-neutral-500">Explore analysis methods and platform workflows.</p></div></div>
              <div className="flex gap-3"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold">3</span><div><p className="text-sm font-semibold text-neutral-900">Keep learning consistently</p><p className="mt-1 text-sm text-neutral-500">Use guides, courses and tutorials to keep building your knowledge.</p></div></div>
            </div>
            <Link href="/programs" className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-lg bg-black px-5 text-sm font-semibold text-white transition hover:bg-neutral-800">Explore learning paths <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </section>

        <section id="resources" className="scroll-mt-24 bg-neutral-50 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <SectionHeading eyebrow="Go beyond the classroom" title="More ways to keep learning" description="Choose the format that works for you, from practical sessions to focused reading and guided programs." />
            <div className="grid gap-5 md:grid-cols-3">
              <Link href="/blog" className="group overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:-translate-y-1 hover:shadow-lg">
                <div className="relative aspect-[1.55/1] overflow-hidden bg-neutral-100"><Image src={ANALYSIS_IMAGE} alt="Market analysis and data visualisation" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition duration-500 group-hover:scale-105" /></div>
                <div className="p-5"><BookOpen className="h-5 w-5 text-neutral-700" /><h3 className="mt-4 text-lg font-semibold text-neutral-950">Guides and insights</h3><p className="mt-2 text-sm leading-6 text-neutral-600">Read useful explanations, tutorials and perspectives that support your learning.</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">Explore articles <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span></div>
              </Link>
              <Link href="/live" className="group overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:-translate-y-1 hover:shadow-lg">
                <div className="relative aspect-[1.55/1] overflow-hidden bg-neutral-100"><Image src={HERO_IMAGE} alt="Trading screens during a practical learning session" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition duration-500 group-hover:scale-105" /></div>
                <div className="p-5"><PlayCircle className="h-5 w-5 text-neutral-700" /><h3 className="mt-4 text-lg font-semibold text-neutral-950">Live learning</h3><p className="mt-2 text-sm leading-6 text-neutral-600">Access the live learning area for practical sessions and demonstrations when available.</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">Visit live learning <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span></div>
              </Link>
              <Link href="/programs" className="group overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:-translate-y-1 hover:shadow-lg">
                <div className="relative aspect-[1.55/1] overflow-hidden bg-neutral-100"><Image src={LEARNING_IMAGE} alt="Learning resources for understanding financial markets" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition duration-500 group-hover:scale-105" /></div>
                <div className="p-5"><GraduationCap className="h-5 w-5 text-neutral-700" /><h3 className="mt-4 text-lg font-semibold text-neutral-950">Guided programs</h3><p className="mt-2 text-sm leading-6 text-neutral-600">Find a structured program and follow a clearer path through the material.</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">View programs <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span></div>
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">From the academy</p><h2 className="text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">Latest learning insights</h2><p className="mt-2 text-sm text-neutral-600">Fresh articles and ideas to help you keep moving forward.</p></div>
            <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-semibold">Visit the insights hub <ArrowRight className="h-4 w-4" /></Link>
          </div>
          {posts.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-3">
              {posts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`} className="group overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="relative aspect-[1.65/1] overflow-hidden bg-neutral-100"><Image src={post.imageUrl || ANALYSIS_IMAGE} alt={post.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition duration-500 group-hover:scale-105" /></div>
                  <div className="p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">{post.category || 'Learning'}</p><h3 className="mt-2 line-clamp-2 text-lg font-semibold leading-snug text-neutral-950">{post.title}</h3><p className="mt-2 line-clamp-3 text-sm leading-6 text-neutral-600">{post.description}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">Read article <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span></div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-8 text-center"><p className="text-sm text-neutral-600">New learning insights will appear here as they are published.</p><Link href="/blog" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold">Browse all articles <ArrowRight className="h-4 w-4" /></Link></div>
          )}
        </section>

        <section className="px-5 pb-16 sm:px-8 sm:pb-20">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-2xl bg-black px-6 py-12 text-white sm:px-12 sm:py-16">
            <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
              <div className="max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">Your next step starts here</p><h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Make learning part of your trading journey.</h2><p className="mt-4 max-w-xl text-sm leading-6 text-neutral-300 sm:text-base">Create an account to access your learning space and continue building your market knowledge.</p></div>
              <Link href="/signup" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white px-6 text-sm font-semibold text-black transition hover:bg-neutral-200">Create your account <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-16">
          <div className="grid gap-10 border-b border-neutral-200 pb-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div className="max-w-sm">
              <Link href="/" className="inline-flex text-xl font-bold tracking-tight text-neutral-950">Varban Academy</Link>
              <p className="mt-4 text-sm leading-6 text-neutral-600">Practical education for people who want to understand markets, technology and the decisions shaping their financial future.</p>
              <Link href="/programs" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-neutral-950 hover:gap-3">Explore learning <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div><h3 className="text-sm font-semibold text-neutral-950">Learn</h3><ul className="mt-4 space-y-3 text-sm text-neutral-600"><li><Link href="/programs" className="hover:text-black">Courses and programs</Link></li><li><Link href="/bootcamps" className="hover:text-black">Bootcamps</Link></li><li><Link href="/blog" className="hover:text-black">Insights and guides</Link></li><li><Link href="/live" className="hover:text-black">Live learning</Link></li></ul></div>
            <div><h3 className="text-sm font-semibold text-neutral-950">Varban Academy</h3><ul className="mt-4 space-y-3 text-sm text-neutral-600"><li><Link href="/about" className="hover:text-black">About us</Link></li><li><Link href="/for-business" className="hover:text-black">For organisations</Link></li><li><Link href="/contact" className="hover:text-black">Contact</Link></li><li><Link href="/help" className="hover:text-black">Help centre</Link></li></ul></div>
            <div><h3 className="text-sm font-semibold text-neutral-950">Legal and privacy</h3><ul className="mt-4 space-y-3 text-sm text-neutral-600"><li><Link href="/legal/terms" className="hover:text-black">Terms and agreements</Link></li><li><Link href="/legal/privacy" className="hover:text-black">Privacy notice</Link></li><li><Link href="/legal/data-use" className="hover:text-black">How we use your data</Link></li><li><Link href="/legal/data-safety" className="hover:text-black">Data safety</Link></li><li><Link href="/account-deletion" className="hover:text-black">Account deletion</Link></li><li><Link href="/legal/legal" className="hover:text-black">Legal information</Link></li></ul></div>
          </div>
          <div className="flex flex-col gap-3 pt-6 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between"><p>© {new Date().getFullYear()} Varban Academy. All rights reserved.</p><p>Educational content only. Learning outcomes are not guaranteed.</p></div>
        </div>
      </footer>
    </div>
  );
}
