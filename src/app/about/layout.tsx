import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Varban Academy | Practical Digital Skills in Africa',
  description: "Learn about Varban Academy's mission to make practical digital education accessible across Kenya and Africa.",
  openGraph: { title: 'About Varban Academy', description: 'Our mission, vision and team.', type: 'website' },
};

export default function AboutLayout({ children }: Readonly<{ children: React.ReactNode }>) { return children; }
