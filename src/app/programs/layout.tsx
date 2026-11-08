import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Certificate Programs | Varban Academy',
  description: 'Explore structured certificate programmes designed to build practical, career-ready skills.',
  openGraph: { title: 'Certificate Programs | Varban Academy', description: 'Structured learning paths and certificates.', type: 'website' },
};

export default function ProgramsLayout({ children }: Readonly<{ children: React.ReactNode }>) { return children; }
