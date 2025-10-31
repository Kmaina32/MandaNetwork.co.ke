
'use client';

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { AppSidebar } from "@/components/Sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Handshake, BookUser, Users, School, ArrowRight } from "lucide-react";
import Link from "next/link";

const partnershipTiers = [
  {
    icon: <BookUser className="h-10 w-10 text-primary" />,
    title: "Content Partners",
    description: "Are you an industry expert or a creator of specialized educational content? Collaborate with us to co-develop new, cutting-edge courses that reach a wide and engaged audience across Kenya.",
  },
  {
    icon: <Handshake className="h-10 w-10 text-primary" />,
    title: "Reseller Partners",
    description: "If you are a consulting firm or IT service provider, partner with us to resell our high-quality training programs to your existing client base, adding value to your services and creating a new revenue stream.",
  },
  {
    icon: <Users className="h-10 w-10 text-primary" />,
    title: "Community Partners",
    description: "We team up with tech hubs, incubators, and industry associations to foster a vibrant learning community. Partner with us to host events, run workshops, and reach a wider audience of aspiring learners.",
  },
  {
    icon: <School className="h-10 w-10 text-primary" />,
    title: "University & Academic Partners",
    description: "Supplement your curriculum with our industry-relevant courses. We work with universities and colleges to integrate our specialized tech and AI training into degree programs, giving students a competitive edge.",
  },
];

export default function PartnersPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="flex-grow">
           <section className="bg-secondary/50 py-16 md:py-24">
            <div className="container mx-auto px-4 md:px-6 text-center">
              <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                <Handshake className="h-12 w-12 text-primary" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold font-headline">Partner with Manda Network</h1>
              <p className="mt-4 text-lg max-w-3xl mx-auto text-muted-foreground">
                Join us in our mission to empower the next generation of tech talent in Kenya and beyond. We believe in the power of collaboration to create impactful learning experiences.
              </p>
            </div>
          </section>

          <section className="py-16 md:py-24">
            <div className="container mx-auto px-4 md:px-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {partnershipTiers.map((tier) => (
                  <Card key={tier.title}>
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-md">
                            {tier.icon}
                        </div>
                        <CardTitle>{tier.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{tier.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

               <div className="text-center mt-16">
                  <h2 className="text-3xl font-bold font-headline">Ready to Collaborate?</h2>
                  <p className="text-muted-foreground mt-2 max-w-xl mx-auto">Let's work together to shape the future of tech education in Africa. Reach out to our partnership team to get started.</p>
                  <Button asChild className="mt-6" size="lg">
                    <Link href="/contact">
                      Contact Us <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  );
}
