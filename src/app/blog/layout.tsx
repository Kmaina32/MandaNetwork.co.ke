import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Varban Academy Blog | Skills, Technology and Careers',
  description: 'Ideas, practical guides and insights on digital skills, technology, learning and careers.',
  openGraph: { title: 'Varban Academy Blog', description: 'Insights on skills, technology and careers.', type: 'website' },
};

export default function BlogLayout({ children }: Readonly<{ children: React.ReactNode }>) { return children; }
