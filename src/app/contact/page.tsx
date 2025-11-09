
'use client';

import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Mail, Phone, MapPin, Building, Info, HelpCircle, Briefcase } from "lucide-react";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/Sidebar';

export default function ContactPage() {
  return (
    <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
            <Header />
            <div className='flex flex-col min-h-screen'>
              <main className="flex-grow flex items-center justify-center p-4 bg-secondary">
                <div className="container mx-auto">
                    <Card className="w-full max-w-4xl mx-auto">
                    <CardHeader className="text-center">
                        <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4">
                            <Mail className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle className="text-3xl font-headline">Contact Us</CardTitle>
                        <CardDescription>We'd love to hear from you. Here's how you can reach us.</CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-8'>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
                            <div className="flex flex-col items-center md:items-start gap-3 p-4 rounded-lg bg-secondary/50">
                                <div className="bg-primary/10 p-2 rounded-md">
                                    <MapPin className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Our Office</h3>
                                    <p className="text-sm text-muted-foreground">Runda Mall, Kiambu Road, Nairobi</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-center md:items-start gap-3 p-4 rounded-lg bg-secondary/50">
                                <div className="bg-primary/10 p-2 rounded-md">
                                    <Mail className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Email Us</h3>
                                    <a href="mailto:info@mandanetwork.co.ke" className="text-sm text-primary underline">info@mandanetwork.co.ke</a>
                                </div>
                            </div>
                            <div className="flex flex-col items-center md:items-start gap-3 p-4 rounded-lg bg-secondary/50">
                                <div className="bg-primary/10 p-2 rounded-md">
                                    <Phone className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Call Us</h3>
                                    <p className="text-sm text-muted-foreground">0747079034 (Mon-Fri, 9am-5pm)</p>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div>
                            <h3 className="text-center font-semibold text-lg mb-4">Looking for something else?</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Button variant="outline" asChild><Link href="/help"><HelpCircle className="mr-2 h-4 w-4"/>Help Center</Link></Button>
                                <Button variant="outline" asChild><Link href="/for-business"><Briefcase className="mr-2 h-4 w-4"/>For Business</Link></Button>
                                <Button variant="outline" asChild><Link href="/about"><Info className="mr-2 h-4 w-4"/>About Us</Link></Button>
                                <Button variant="outline" asChild><Link href="/">All Courses</Link></Button>
                            </div>
                        </div>
                    </CardContent>
                    </Card>
                </div>
              </main>
              <Footer />
            </div>
        </SidebarInset>
    </SidebarProvider>
  );
}
