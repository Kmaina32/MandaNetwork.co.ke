'use client';

import { useState, useEffect } from 'react';
import { Footer } from "@/components/Footer";
import { AppSidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { getAllBootcamps, getHeroData } from '@/lib/firebase-service';
import type { Bootcamp } from '@/lib/types';
import { Loader2, Rocket } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

function BootcampCard({ bootcamp }: { bootcamp: Bootcamp }) {
  return (
    <Card className="flex flex-col h-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg">
      <CardHeader className="p-0">
        <Link href={`/bootcamps/${bootcamp.id}`}>
          <div className="relative w-full h-48">
            <Image
              src={bootcamp.imageUrl}
              alt={bootcamp.title}
              fill
              className="object-cover"
              data-ai-hint="tech bootcamp"
            />
             <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        </Link>
      </CardHeader>
      <CardContent className="p-6 flex-grow">
        <div className="flex justify-between items-center mb-2">
            <Badge variant="destructive">{bootcamp.duration}</Badge>
            <p className="text-xs text-muted-foreground">Starts: {format(new Date(bootcamp.startDate), 'PPP')}</p>
        </div>
        <CardTitle className="text-xl mb-2 font-headline">{bootcamp.title}</CardTitle>
        <p className="text-muted-foreground text-sm line-clamp-3">{bootcamp.description}</p>
      </CardContent>
      <CardFooter className="p-6 pt-0 flex justify-between items-center">
        <p className="text-lg font-bold text-primary">
          {bootcamp.price > 0 ? `Ksh ${bootcamp.price.toLocaleString()}` : 'Free'}
        </p>
         <Button asChild>
            <Link href={`/bootcamps/${bootcamp.id}`}>View Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function BootcampsPage() {
  const [bootcamps, setBootcamps] = useState<Bootcamp[]>([]);
  const [heroData, setHeroData] = useState<{ bootcampsImageUrl?: string }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPageData = async () => {
      try {
        setLoading(true);
        const [fetchedBootcamps, fetchedHeroData] = await Promise.all([
            getAllBootcamps(),
            getHeroData()
        ]);
        setBootcamps(fetchedBootcamps);
        setHeroData(fetchedHeroData);
      } catch (err) {
        console.error(err);
        setError("Failed to load bootcamps. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchPageData();
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="flex-grow">
          <section className="relative bg-secondary/50 py-12 md:py-16">
            <div className="container mx-auto px-4 md:px-6">
               <div className="relative rounded-xl overflow-hidden min-h-[400px] flex items-center justify-center text-center p-4">
                    {heroData.bootcampsImageUrl && (
                      <Image
                          src={heroData.bootcampsImageUrl}
                          alt="A group of people working on laptops in a workshop"
                          fill
                          className="object-cover"
                          data-ai-hint="coding workshop"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/60"></div>
                    <div className="relative z-10 text-white">
                        <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                            <Rocket className="h-10 w-10 text-primary" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold font-headline">Manda Network Bootcamps</h1>
                        <p className="mt-4 text-lg max-w-3xl mx-auto">
                            Accelerate your career with our intensive, hands-on bootcamps designed to get you job-ready.
                        </p>
                    </div>
                </div>
            </div>
          </section>

          <section className="py-12 md:py-16">
            <div className="container mx-auto px-4 md:px-6">
              {error ? (
                <p className="text-destructive text-center">{error}</p>
              ) : loading ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="ml-2">Loading bootcamps...</p>
                </div>
              ) : bootcamps.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {bootcamps.map((bootcamp) => (
                    <BootcampCard key={bootcamp.id} bootcamp={bootcamp} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <p>There are no bootcamps available at this time. Please check back soon!</p>
                </div>
              )}
            </div>
          </section>
        </main>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  );
}
