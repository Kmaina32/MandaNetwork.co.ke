
'use client';

import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Mail, Phone, MapPin, Building, Info, HelpCircle, Briefcase, Send } from "lucide-react";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/Sidebar';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function ContactPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <div className='flex flex-col min-h-screen'>
          <main className="flex-grow p-4 md:p-8 bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto">
              <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-extrabold font-headline text-gray-800 dark:text-white">Get in Touch</h1>
                <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">We're here to help and answer any question you might have.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Contact Information Section */}
                <div className="space-y-8">
                  <div className="flex items-start space-x-4">
                    <div className="bg-primary/10 p-3 rounded-full"><MapPin className="h-6 w-6 text-primary" /></div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Our Office</h3>
                      <p className="text-gray-600 dark:text-gray-400">Serena Rd, Mombasa, Kenya</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="bg-primary/10 p-3 rounded-full"><Mail className="h-6 w-6 text-primary" /></div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Email Us</h3>
                      <a href="mailto:info@mandanetwork.co.ke" className="text-primary hover:underline">info@mandanetwork.co.ke</a>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="bg-primary/10 p-3 rounded-full"><Phone className="h-6 w-6 text-primary" /></div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Call Us</h3>
                      <p className="text-gray-600 dark:text-gray-400">+254742999999 (Mon-Fri, 9am-5pm)</p>
                    </div>
                  </div>
                  
                  {/* Placeholder for a map */}
                  <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">Map Placeholder</p>
                  </div>
                </div>

                {/* Contact Form Section */}
                <Card className="w-full">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold">Send us a Message</CardTitle>
                    <CardDescription>Fill out the form and we'll get back to you.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form className="space-y-4">
                      <Input placeholder="Your Name" />
                      <Input type="email" placeholder="Your Email" />
                      <Textarea placeholder="Your Message" className="min-h-[150px]" />
                      <Button type="submit" className="w-full"><Send className="mr-2 h-4 w-4"/>Send Message</Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* FAQ Section */}
              <div className="mt-20">
                <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-8">Frequently Asked Questions</h2>
                <Accordion type="single" collapsible className="w-full max-w-3xl mx-auto">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>What is Manda Network?</AccordionTrigger>
                    <AccordionContent>
                      Manda Network is a platform dedicated to providing high-quality online courses and career development resources.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2">
                    <AccordionTrigger>How can I enroll in a course?</AccordionTrigger>
                    <AccordionContent>
                      You can browse our course catalog and enroll directly through the course page. Payment can be made through our secure online portal.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3">
                    <AccordionTrigger>Do you offer support for businesses?</AccordionTrigger>
                    <AccordionContent>
                      Yes, we have dedicated programs for businesses and organizations. Please visit our 'For Business' page or contact us for more information.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
