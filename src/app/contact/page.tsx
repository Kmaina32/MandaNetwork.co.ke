
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Mail, Phone, MapPin, Send, Loader2 } from "lucide-react";
import { Button } from '@/components/ui/button';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/Sidebar';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { sendGeneralContactMessage } from '@/app/actions';

const contactFormSchema = z.object({
  name: z.string().min(2, "Please enter your name."),
  email: z.string().email("Please enter a valid email address."),
  message: z.string().min(10, "Message must be at least 10 characters long."),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

const faqItems = [
    {
        question: "What payment methods do you accept?",
        answer: "We accept payments via M-Pesa, Credit/Debit Cards (Visa, Mastercard), PayPal, and our own MandaToken (MDT) cryptocurrency."
    },
    {
        question: "How do I access a course after enrolling?",
        answer: "Once you've enrolled, the course will appear on your main Dashboard. Simply click the \"Jump Back In\" button on the course card to start or continue learning."
    },
    {
        question: "How do I get my certificate?",
        answer: "A certificate is awarded after you successfully complete all course lessons and pass the final exam with a score of 80% or higher. Once you meet these requirements, a \"View Certificate\" button will appear on your dashboard for that course."
    },
    {
        question: "Are there any prerequisites for the courses?",
        answer: "Some advanced courses may have prerequisites. These will be clearly listed on the course details page. You must complete the prerequisite course before you can enroll."
    },
    {
        question: "What is the AI Career Coach?",
        answer: "The AI Career Coach is a special tool that helps you plan your learning journey. Tell it your career goal, and it will recommend a personalized sequence of courses from our catalog to help you get there."
    },
    {
        question: "How do the hackathons work?",
        answer: "Our hackathons are competitive events where you can build real-world projects. You can register, submit your project through our portal, and compete for prizes and leaderboard points."
    },
    {
        question: "I forgot my password. What do I do?",
        answer: "If you've forgotten your password, go to the Login page and click the \"Forgot your password?\" link. You will receive an email with instructions on how to reset your password."
    },
    {
        question: "Can I get a refund for a course?",
        answer: "Due to the digital nature of our content, we generally do not offer refunds once a course has been accessed. Please review the course details carefully before purchasing."
    },
    {
        question: "How can I showcase my work to employers?",
        answer: "Complete your profile in the 'Profile' section and set it to public. This makes your portfolio, including completed projects and certificates, visible to potential employers in our Hiring Center."
    },
    {
        question: "Do you offer corporate training or team accounts?",
        answer: "Yes, we do! We have a dedicated Organization Portal for businesses to manage their team's learning. Please visit our 'For Business' page or contact us for more information."
    }
];


export default function ContactPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: { name: '', email: '', message: '' },
  });

  const onSubmit = async (values: ContactFormValues) => {
    setIsLoading(true);
    try {
      await sendGeneralContactMessage(values);
      toast({
        title: "Message Sent!",
        description: "Thank you for contacting us. We will get back to you shortly.",
      });
      form.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send your message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
                      <p className="text-gray-600 dark:text-gray-400">Runda Mall, Kiambu road</p>
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
                      <p className="text-gray-600 dark:text-gray-400">0747079034 (Mon-Fri, 9am-5pm)</p>
                    </div>
                  </div>
                  
                  {/* Google Map */}
                  <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden">
                    <iframe
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3988.88339194207!2d36.821946315263!3d-1.239228899092049!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x182f165a25c00b21%3A0x2a98c8c51a9a8f4c!2sRunda%20Mall!5e0!3m2!1sen!2ske!4v1628771175658!5m2!1sen!2ske"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen={true}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    ></iframe>
                  </div>
                </div>

                {/* Contact Form Section */}
                <Card className="w-full">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold">Send us a Message</CardTitle>
                    <CardDescription>Fill out the form and we'll get back to you.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                         <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Your Name</FormLabel>
                                    <FormControl><Input placeholder="Jomo Kenyatta" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Your Email</FormLabel>
                                    <FormControl><Input type="email" placeholder="you@example.com" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="message"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Your Message</FormLabel>
                                    <FormControl><Textarea placeholder="Your message..." className="min-h-[150px]" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full" disabled={isLoading}>
                          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                          Send Message
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>

              {/* FAQ Section */}
              <div className="mt-20">
                <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-8">Frequently Asked Questions</h2>
                <Accordion type="single" collapsible className="w-full max-w-3xl mx-auto">
                  {faqItems.map((item, index) => (
                    <AccordionItem value={`item-${index}`} key={index}>
                        <AccordionTrigger>{item.question}</AccordionTrigger>
                        <AccordionContent>{item.answer}</AccordionContent>
                    </AccordionItem>
                  ))}
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
