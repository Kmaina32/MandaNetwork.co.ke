
'use client';

import Link from 'next/link';
import { GitBranch, Twitter, Facebook, Linkedin, Rss } from 'lucide-react';
import { Button } from './ui/button';

export function Footer() {
  return (
    <footer className="border-t">
      <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <GitBranch className="h-6 w-6 text-yellow-500" />
            <span className="font-bold font-headline">Manda Network</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
             <Link href="/terms" className="text-sm hover:text-primary">Terms of Service</Link>
             <Link href="/privacy" className="text-sm hover:text-primary">Privacy Policy</Link>
             <Link href="/developer" className="text-sm hover:text-primary">Developer</Link>
             <Link href="/partners" className="text-sm hover:text-primary">Partners</Link>
          </div>
          <div className="flex items-center gap-2">
             <Button asChild variant="ghost" size="icon">
                <Link href="https://twitter.com" target="_blank" rel="noopener noreferrer">
                    <Twitter className="h-4 w-4" />
                    <span className="sr-only">Twitter</span>
                </Link>
             </Button>
              <Button asChild variant="ghost" size="icon">
                <Link href="https://facebook.com" target="_blank" rel="noopener noreferrer">
                    <Facebook className="h-4 w-4" />
                     <span className="sr-only">Facebook</span>
                </Link>
             </Button>
             <Button asChild variant="ghost" size="icon">
                <Link href="https://www.instagram.com/manda.networkhub/" target="_blank" rel="noopener noreferrer">
                    <Rss className="h-4 w-4" />
                     <span className="sr-only">Instagram</span>
                </Link>
             </Button>
              <Button asChild variant="ghost" size="icon">
                <Link href="https://linkedin.com" target="_blank" rel="noopener noreferrer">
                    <Linkedin className="h-4 w-4" />
                     <span className="sr-only">LinkedIn</span>
                </Link>
             </Button>
          </div>
        </div>
         <p className="text-center text-xs text-muted-foreground mt-4">
            © {new Date().getFullYear()} Manda Network. All rights reserved. | ISO 9001 Certified
          </p>
      </div>
    </footer>
  );
}
