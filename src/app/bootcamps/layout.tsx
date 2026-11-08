import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Career Bootcamps | Varban Academy',
  description: 'Explore intensive, hands-on bootcamps to develop practical skills and prepare for work.',
  openGraph: { title: 'Career Bootcamps | Varban Academy', description: 'Hands-on career-focused bootcamps.', type: 'website' },
};

export default function BootcampsLayout({ children }: Readonly<{ children: React.ReactNode }>) { return children; }
