
'use client';

import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Lock } from "lucide-react";
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/Sidebar';

export default function PrivacyPage() {
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
                          <Lock className="h-10 w-10 text-primary" />
                      </div>
                    <CardTitle className="text-3xl font-headline text-center">Privacy Policy</CardTitle>
                    <CardDescription className="text-lg text-muted-foreground text-center">Last updated: August 27, 2025</CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-6'>
                    <div className="space-y-4 prose prose-sm sm:prose-base max-w-none dark:prose-invert prose-headings:font-headline">
                      <p>Your privacy is important to us. It is Manda Network's policy to respect your privacy regarding any information we may collect from you across our website, and other sites we own and operate.</p>
                      
                      <h2 className="font-semibold text-xl">1. Information We Collect</h2>
                      <p><strong>Log data:</strong> When you visit our website, our servers may automatically log the standard data provided by your web browser. It may include your computer’s Internet Protocol (IP) address, your browser type and version, the pages you visit, the time and date of your visit, the time spent on each page, and other details.</p>
                      <p><strong>Personal information:</strong> We may ask for personal information, such as your: Name, Email, Social media profiles, Date of birth, Phone/mobile number, Home/Mailing address.</p>
                      
                      <h2 className="font-semibold text-xl">2. Legal Bases for Processing</h2>
                      <p>We will process your personal information lawfully, fairly and in a transparent manner. We collect and process information about you only where we have legal bases for doing so. These legal bases depend on the services you use and how you use them, meaning we collect and use your information only where: it’s necessary for the performance of a contract to which you are a party; it satisfies a legitimate interest (which is not overridden by your data protection interests); you give us consent to do so for a specific purpose; or we need to process your data to comply with a legal obligation.</p>

                      <h2 className="font-semibold text-xl">3. Security of Your Personal Information</h2>
                      <p>We use commercially acceptable means to protect your personal information from loss and theft, as well as unauthorized access, disclosure, copying, use or modification. That said, we advise that no method of electronic transmission or storage is 100% secure and cannot guarantee absolute data security.</p>
                      
                      <h2 className="font-semibold text-xl">4. How Long We Keep Your Personal Information</h2>
                      <p>We keep your personal information only for as long as we need to. This time period may depend on what we are using your information for, in accordance with this privacy policy. If your personal information is no longer required, we will delete it or make it anonymous by removing all details that identify you.</p>

                      <h2 className="font-semibold text-xl">5. Your Rights and Controlling Your Personal Information</h2>
                      <p>You always retain the right to withhold personal information from us, with the understanding that your experience of our website may be affected. We will not discriminate against you for exercising any of your rights over your personal information.</p>
                      
                      <p className="pt-4 text-center text-muted-foreground">This policy is effective as of 27 August 2025.</p>
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
