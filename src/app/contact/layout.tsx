import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Varban Academy',
  description: 'Contact the Varban Academy team for course, programme and learner support enquiries.',
  openGraph: { title: 'Contact Varban Academy', description: 'Get in touch with our team.', type: 'website' },
};

export default function ContactLayout({ children }: Readonly<{ children: React.ReactNode }>) { return children; }
