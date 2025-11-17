
import { getHeroData } from '@/lib/firebase-server';
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { AppSidebar } from "@/components/Sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, BarChart, Building, Users } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { ForBusinessRedirect } from '@/components/ForBusinessRedirect';

const features = [
    {
        icon: <Users className="h-8 w-8 text-primary" />,
        title: "Manage Your Team",
        description: "Easily invite, remove, and manage employees in one central dashboard."
    },
    {
        icon: <BarChart className="h-8 w-8 text-primary" />,
        title: "Track Progress",
        description: "Monitor course completion rates and see how your team is upskilling."
    },
    {
        icon: <Building className="h-8 w-8 text-primary" />,
        title: "Customized Learning",
        description: "Assign specific courses or bundles to individuals or entire teams."
    }
];


export default async function ForBusinessPage() {
  const heroData = await getHeroData();

  return (
    <>
      <ForBusinessRedirect />
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <Header />
          <main className="flex-grow">
              <section className="relative py-20 md:py-32 bg-secondary p-4">
                   <div className="absolute inset-4 rounded-xl overflow-hidden">
                      {heroData.orgHeroImageUrl && (
                          <Image
                              src={heroData.orgHeroImageUrl}
                              alt="Professional team collaborating"
                              fill
                              className="object-cover"
                              data-ai-hint="team collaboration"
                          />
                      )}
                       <div className="absolute inset-0 bg-black/60"></div>
                  </div>
                  <div className="container mx-auto px-4 md:px-6 text-center relative text-white py-10">
                      <h1 className="text-4xl md:text-5xl font-bold font-headline">{heroData.orgHeroTitle || 'Manda Network for Organizations'}</h1>
                      <p className="mt-4 text-lg md:text-xl max-w-3xl mx-auto">{heroData.orgHeroSubtitle || 'Empower your workforce with the skills they need to succeed.'}</p>
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
                         <Button asChild size="lg" className="w-full sm:w-auto">
                            <Link href="/organization/signup">
                                Get Started
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                        </Button>
                         <Button asChild size="lg" variant="outline" className="w-full sm:w-auto bg-transparent text-white border-white hover:bg-white hover:text-black">
                            <Link href="/organization/login">
                                Organization Login
                            </Link>
                        </Button>
                      </div>
                  </div>
              </section>
              
              <section className="py-16 md:py-24">
                  <div className="container mx-auto px-4 md:px-6">
                      <div className="text-center mb-12">
                          <h2 className="text-3xl font-bold font-headline">A Powerful, Simple Platform for Upskilling</h2>
                          <p className="mt-2 text-muted-foreground">Everything you need to manage your team's learning journey.</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                          {features.map((feature, index) => (
                              <Card key={index} className="text-center">
                                  <CardHeader>
                                      <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                                          {feature.icon}
                                      </div>
                                      <CardTitle>{feature.title}</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                      <p className="text-muted-foreground">{feature.description}</p>
                                  </CardContent>
                              </Card>
                          ))}
                      </div>
                  </div>
              </section>
          </main>
          <Footer />
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
