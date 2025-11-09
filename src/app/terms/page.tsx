
'use client';

import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Shield } from "lucide-react";
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/Sidebar';

export default function TermsPage() {
  return (
    <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
            <Header />
            <div className='flex flex-col min-h-screen'>
              <main className="flex-grow flex items-center justify-center p-4 bg-secondary">
                <Card className="w-full max-w-4xl text-left">
                  <CardHeader>
                      <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                          <Shield className="h-10 w-10 text-primary" />
                      </div>
                    <CardTitle className="text-3xl font-headline text-center">Terms of Service</CardTitle>
                    <CardDescription className="text-lg text-muted-foreground text-center">Last updated: August 27, 2025</CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-6'>
                    <div className="space-y-4 prose prose-sm sm:prose-base max-w-none dark:prose-invert prose-headings:font-headline">
                      <p>Welcome to Manda Network. These terms and conditions outline the rules and regulations for the use of Manda Network's Website.</p>
                      
                      <h2 className="font-semibold text-xl">1. Acceptance of Terms</h2>
                      <p>By accessing this website, we assume you accept these terms and conditions. Do not continue to use Manda Network if you do not agree to take all of the terms and conditions stated on this page.</p>
                      
                      <h2 className="font-semibold text-xl">2. User Accounts</h2>
                      <p>To access most features of the platform, you must register for an account. You are responsible for safeguarding your account information, including your password, and for any activities or actions under your account. You agree to notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.</p>

                      <h2 className="font-semibold text-xl">3. Use License</h2>
                      <p>Permission is granted to temporarily download one copy of the materials (information or software) on Manda Network's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not: modify or copy the materials; use the materials for any commercial purpose, or for any public display (commercial or non-commercial); attempt to decompile or reverse engineer any software contained on Manda Network's website; remove any copyright or other proprietary notations from the materials; or transfer the materials to another person or "mirror" the materials on any other server.</p>

                      <h2 className="font-semibold text-xl">4. Disclaimer</h2>
                      <p>The materials on Manda Network's website are provided on an 'as is' basis. Manda Network makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>
                      
                      <h2 className="font-semibold text-xl">5. Limitations</h2>
                      <p>In no event shall Manda Network or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Manda Network's website, even if Manda Network or a Manda Network authorized representative has been notified orally or in writing of the possibility of such damage.</p>

                      <h2 className="font-semibold text-xl">6. Governing Law</h2>
                      <p>These terms and conditions are governed by and construed in accordance with the laws of Kenya and you irrevocably submit to the exclusive jurisdiction of the courts in that State or location.</p>
                    </div>
                  </CardContent>
                </Card>
              </main>
              <Footer />
            </div>
        </SidebarInset>
    </SidebarProvider>
  );
}
