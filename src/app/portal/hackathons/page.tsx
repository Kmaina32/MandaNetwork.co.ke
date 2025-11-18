'use client';

import { useState, useEffect } from 'react';
import { getAllHackathons, Hackathon, getHeroData, registerForHackathon } from '@/lib/firebase-service';
import { Loader2, Trophy, FileText, Scale, Star, GitBranch } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, isPast } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HackathonOnboarding } from '@/components/HackathonOnboarding';
import { useToast } from '@/hooks/use-toast';
import { checkHackathonParticipantAchievement } from '@/lib/achievements';

function HackathonCard({ hackathon }: { hackathon: Hackathon }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isRegistering, setIsRegistering] = useState(false);
    const [isParticipant, setIsParticipant] = useState(false);
    
    const hasEnded = isPast(new Date(hackathon.endDate));
    const hasStarted = isPast(new Date(hackathon.startDate));

    useEffect(() => {
        if (user && hackathon.participants) {
            setIsParticipant(!!hackathon.participants[user.uid]);
        }
    }, [user, hackathon.participants]);

    const handleRegister = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();

        if (!user) {
            toast({ title: 'Login Required', description: 'You must be logged in to register for a hackathon.', variant: 'destructive'});
            return;
        }

        setIsRegistering(true);
        try {
            await registerForHackathon(hackathon.id, user.uid);
            await checkHackathonParticipantAchievement(user.uid);
            toast({ title: 'Success!', description: `You are now registered for ${hackathon.title}.` });
            setIsParticipant(true);
        } catch (error) {
            toast({ title: 'Error', description: 'Could not register for the hackathon.', variant: 'destructive'});
        } finally {
            setIsRegistering(false);
        }
    };


  return (
    <Card className="flex flex-col h-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg">
      <CardHeader className="p-0">
        <Link href={`/portal/hackathons/${hackathon.id}`}>
          <div className="relative w-full h-48">
            <Image
              src={hackathon.imageUrl}
              alt={hackathon.title}
              fill
              className="object-cover"
              data-ai-hint="hackathon coding event"
            />
             <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
             <div className="absolute top-2 right-2">
                {hasEnded ? (
                    <Badge variant="destructive">Ended</Badge>
                ) : hasStarted ? (
                    <Badge className="bg-red-500 text-white">Live</Badge>
                ) : (
                    <Badge>Upcoming</Badge>
                )}
             </div>
          </div>
        </Link>
      </CardHeader>
      <CardContent className="p-6 flex-grow">
         <p className="text-xs text-muted-foreground mb-2">
            {format(new Date(hackathon.startDate), 'PPP')} - {format(new Date(hackathon.endDate), 'PPP')}
        </p>
        <CardTitle className="text-xl mb-2 font-headline">{hackathon.title}</CardTitle>
        <p className="text-muted-foreground text-sm line-clamp-3">{hackathon.description}</p>
      </CardContent>
      <CardFooter className="p-6 pt-0 flex justify-between items-center">
        <p className="text-lg font-bold text-primary">
          {hackathon.entryFee > 0 ? `Ksh ${hackathon.entryFee.toLocaleString()}` : 'Free'}
        </p>
        {isParticipant ? (
            <Button asChild>
                <Link href={`/portal/hackathons/${hackathon.id}`}>View Details</Link>
            </Button>
        ) : (
             <Button onClick={handleRegister} disabled={isRegistering || hasEnded}>
                {isRegistering ? <Loader2 className="h-4 w-4 animate-spin" /> : (hasEnded ? 'Event Ended' : 'Register Now')}
             </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function HackathonGuidelines() {
    return (
        <section className="py-12 md:py-16 bg-background">
            <div className="container mx-auto px-4 md:px-6 max-w-4xl">
                 <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold font-headline">How It Works</h2>
                    <p className="mt-2 text-muted-foreground">Key information about participating in our hackathons.</p>
                </div>
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                        <AccordionTrigger>
                            <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-primary" />
                                <span className="font-semibold">General Rules & Conduct</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            All participants must adhere to our code of conduct. Teams can consist of 1 to 4 members. All code must be written during the hackathon period unless otherwise specified. Be respectful, be creative, and have fun!
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                        <AccordionTrigger>
                            <div className="flex items-center gap-3">
                                <GitBranch className="h-5 w-5 text-primary" />
                                <span className="font-semibold">Submission Policy</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                           You can make up to 3 submissions for each hackathon. Your last submission before the deadline will be considered your final entry for judging.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3">
                        <AccordionTrigger>
                            <div className="flex items-center gap-3">
                                <Star className="h-5 w-5 text-primary" />
                                <span className="font-semibold">Judging Criteria</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                           Projects are judged on four main criteria: Technical Complexity, Creativity & Innovation, Design & User Experience, and Presentation/Pitch. Make sure your project addresses the hackathon theme.
                        </AccordionContent>
                    </AccordionItem>
                     <AccordionItem value="item-4">
                        <AccordionTrigger>
                             <div className="flex items-center gap-3">
                                <Scale className="h-5 w-5 text-primary" />
                                <span className="font-semibold">No-Refund Policy</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            Please note that all entry fees for hackathons are non-refundable. This policy helps us manage event logistics and prize pools effectively. We appreciate your understanding.
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        </section>
    )
}

export default function HackathonsPage() {
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [heroData, setHeroData] = useState<{ hackathonsImageUrl?: string }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
        router.push('/login');
        return;
    }

    const fetchPageData = async () => {
      try {
        setLoading(true);
        const [fetchedHackathons, fetchedHeroData] = await Promise.all([
          getAllHackathons(),
          getHeroData()
        ]);
        setHackathons(fetchedHackathons.sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
        setHeroData(fetchedHeroData);
      } catch (err) {
        console.error(err);
        setError("Failed to load hackathons. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchPageData();
  }, [user, authLoading, router]);

  if (authLoading || loading) {
     return (
        <main className="flex-grow flex items-center justify-center">
             <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
     )
  }

  return (
        <main className="flex-grow">
          <HackathonOnboarding />
          <section className="relative bg-secondary/50 py-12 md:py-16">
            <div className="container mx-auto px-4 md:px-6">
                <div className="relative rounded-xl overflow-hidden min-h-[400px] flex items-center justify-center text-center p-4">
                    {heroData.hackathonsImageUrl && (
                      <Image
                          src={heroData.hackathonsImageUrl}
                          alt="A group of developers collaborating at a hackathon"
                          fill
                          className="object-cover"
                          data-ai-hint="developers collaboration"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/60"></div>
                    <div className="relative z-10 text-white">
                        <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                            <Trophy className="h-10 w-10 text-primary" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold font-headline">Hackathons</h1>
                        <p className="mt-4 text-lg max-w-3xl mx-auto">
                            Compete, innovate, and win. Join our hackathons to build real-world projects and showcase your skills.
                        </p>
                    </div>
                </div>
            </div>
          </section>

          <section className="py-12 md:py-16">
            <div className="container mx-auto px-4 md:px-6">
              {error ? (
                <p className="text-destructive text-center">{error}</p>
              ) : hackathons.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {hackathons.map((hackathon) => (
                    <HackathonCard key={hackathon.id} hackathon={hackathon} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <p>There are no hackathons scheduled at this time. Please check back soon!</p>
                </div>
              )}
            </div>
          </section>

          <HackathonGuidelines />
        </main>
  );
}
