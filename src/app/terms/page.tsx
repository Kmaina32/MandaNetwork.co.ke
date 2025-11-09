
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
                    <CardDescription className="text-lg text-muted-foreground text-center">Last updated: August 28, 2025</CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-6'>
                    <div className="space-y-4 prose prose-sm sm:prose-base max-w-none dark:prose-invert prose-headings:font-headline">
                      <p>Welcome to Manda Network. These terms and conditions outline the rules and regulations for the use of Manda Network's Website, located at www.mandanetwork.co.ke.</p>
                      
                      <h2 className="font-semibold text-xl">1. Acceptance of Terms</h2>
                      <p>By accessing this website, we assume you accept these terms and conditions. Do not continue to use Manda Network if you do not agree to take all of the terms and conditions stated on this page. Our Terms and Conditions were created with the help of the Terms And Conditions Generator.</p>
                      
                      <h2 className="font-semibold text-xl">2. User Accounts</h2>
                      <p>To access most features of the platform, you must register for an account. You are responsible for safeguarding your account information, including your password, and for any activities or actions under your account. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account. You may not use as a username the name of another person or entity or that is not lawfully available for use, a name or trademark that is subject to any rights of another person or entity other than you without appropriate authorization, or a name that is otherwise offensive, vulgar or obscene.</p>

                      <h2 className="font-semibold text-xl">3. Intellectual Property</h2>
                      <p>The Service and its original content (excluding Content provided by users), features and functionality are and will remain the exclusive property of Manda Network and its licensors. The Service is protected by copyright, trademark, and other laws of both the Kenya and foreign countries. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of Manda Network.</p>
                      
                      <h2 className="font-semibold text-xl">4. Use License & Content</h2>
                      <p>Permission is granted to temporarily download one copy of the materials on Manda Network's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title. Our Service allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material ("Content"). You are responsible for the Content that you post on or through the Service, including its legality, reliability, and appropriateness.</p>

                      <h2 className="font-semibold text-xl">5. Disclaimer</h2>
                      <p>The materials on Manda Network's website are provided on an 'as is' basis. Manda Network makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>
                      
                      <h2 className="font-semibold text-xl">6. Limitations of Liability</h2>
                      <p>In no event shall Manda Network, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service; (iii) any content obtained from the Service; and (iv) unauthorized access, use or alteration of your transmissions or content, whether based on warranty, contract, tort (including negligence) or any other legal theory, whether or not we have been informed of the possibility of such damage, and even if a remedy set forth herein is found to have failed of its essential purpose.</p>

                      <h2 className="font-semibold text-xl">7. Governing Law</h2>
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
