
import type {Metadata} from 'next';
import '@/styles/globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeEffects } from '@/components/ThemeEffects';
import { Analytics } from "@vercel/analytics/next"
import { CookieConsent } from '@/components/shared/CookieConsent';
import { Providers } from './providers';
import { AdPopup } from '@/components/AdPopup';
import { UserOnboarding } from '@/components/shared/UserOnboarding';

const BASE_URL = 'https://www.mandanetwork.co.ke';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Manda Network | Empowering Digital Africa',
    template: `%s | Manda Network`,
  },
  description: 'Manda Network is Africa’s leading digital learning and innovation platform—building the next generation of tech talent across Kenya, East Africa, and the continent.',
  keywords: "Manda Network, Africa tech startups, AI learning, online courses, bootcamps, East Africa, Kenya, digital skills, innovation hub",
  authors: [{ name: "Manda Network" }],
  robots: "index, follow",
  verification: {
    google: 'qNZsueqgogEIZHV-vcsY-Kv7tkLo82P_-w7BQvJG1jY',
  },
  openGraph: {
    title: 'Manda Network | Empowering Digital Africa',
    description: 'Join Africa’s fastest-growing platform for digital learning and innovation. Learn AI, coding, business, and more with Manda Network.',
    url: BASE_URL,
    siteName: 'Manda Network',
    images: [
      {
        url: `${BASE_URL}/assets/og-image.jpg`,
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_KE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Manda Network | Empowering Digital Africa',
    description: 'Build digital skills, launch startups, and innovate with Africa’s top online platform.',
    images: [`${BASE_URL}/assets/og-image.jpg`],
  },
  icons: {
    icon: "/favicon.ico",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Manda Network",
  "url": "https://www.mandanetwork.co.ke/",
  "logo": "https://www.mandanetwork.co.ke/assets/logo.png",
  "sameAs": [
    "https://www.linkedin.com/company/mandanetwork",
    "https://www.instagram.com/mandanetwork",
    "https://www.twitter.com/mandanetwork",
    "https://www.facebook.com/mandanetwork"
  ],
  "contactPoint": [{
    "@type": "ContactPoint",
    "telephone": "+254742999999",
    "contactType": "customer service",
    "areaServed": "KE",
    "availableLanguage": ["English", "Swahili"]
  }],
  "founder": {
    "@type": "Person",
    "name": "George Maina",
    "jobTitle": "CTO"
  },
  "description": "Manda Network is a pan-African platform that powers digital education, startups, and innovation hubs across Africa. We bridge the talent gap through AI, technology, and entrepreneurship.",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Serena Rd",
    "addressLocality": "Mombasa",
    "addressCountry": "KE"
  }
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Manda Network",
  "url": BASE_URL,
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${BASE_URL}/?q={search_term_string}`
    },
    "query-input": "required name=search_term_string"
  }
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isAiConfigured = !!process.env.GEMINI_API_KEY || !!process.env.OPENAI_API_KEY;

  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=MuseoModerno:wght@700&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body className="font-body antialiased">
        <Providers isAiConfigured={isAiConfigured}>
            <ThemeEffects />
            {children}
            <Analytics />
            <AdPopup />
            <UserOnboarding />
        </Providers>
        <Toaster />
        <CookieConsent />
      </body>
    </html>
  );
}
