

'use client';

import { useState, useEffect } from 'react';
import { notFound, useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from 'next/link';
import type { Hackathon, RegisteredUser } from "@/lib/mock-data";
import { getHackathonById, getHackathonParticipants, registerForHackathon } from '@/lib/firebase-service';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Trophy, Users, ExternalLink, GitBranch } from "lucide-react";
import { useAuth } from '@/hooks/use-auth';
import { format, isPast } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { PaymentModal } from '@/components/PaymentModal';
import { LoadingAnimation } from '@/components/LoadingAnimation';

export default function HackathonDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [participants, setParticipants] = useState<RegisteredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const isParticipant = participants.some(p => p.uid === user?.uid);
  const hasEnded = hackathon ? isPast(new Date(hackathon.endDate)) : false;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
        router.push('/login');
        return;
    }

    const fetchDetails = async () => {
        setLoading(true);
        try {
            const [hackathonData, participantsData] = await Promise.all([
                getHackathonById(params.id),
                getHackathonParticipants(params.id)
            ]);

            if (!hackathonData) {
                notFound();
                return;
            }
            
            setHackathon(hackathonData);
            setParticipants(participantsData);

        } catch (error) {
            console.error("Failed to fetch hackathon details:", error);
        } finally {
            setLoading(false);
        }
    }
    fetchDetails();
  }, [params.id, user, authLoading, router]);
  
  const handleRegister = async () => {
      if (!user || !hackathon) return;
      setIsRegistering(true);
      try {
        await registerForHackathon(hackathon.id, user.uid);
        toast({ title: 'Registration Successful!', description: `You are now registered for ${hackathon.title}.`});
        const participantsData = await getHackathonParticipants(params.id);
        setParticipants(participantsData);
      } catch (error) {
           toast({ title: 'Registration Failed', description: "Could not register you for the hackathon.", variant: 'destructive'});
      } finally {
          setIsRegistering(false);
          setIsModalOpen(false);
      }
  }


  if (loading || authLoading) {
    return (
        <div className="flex justify-center items-center min-h-screen px-4">
            <LoadingAnimation />
        </div>
    )
  }

  if (!hackathon) {
    notFound();
  }

  return (
    <>
      <main className="flex-grow bg-secondary/30">
        <section className="relative py-12 md:py-20">
          <div className="absolute inset-0">
            <Image
              src={hackathon.imageUrl}
              alt={hackathon.title}
              fill
              className="object-cover"
              data-ai-hint="tech conference students coding"
            />
            <div className="absolute inset-0 bg-black/60"></div>
          </div>
          <div className="container mx-auto px-4 md:px-6 relative text-white text-center">
            <Badge variant="secondary" className="mb-4 bg-primary text-white border-primary">Hackathon</Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 font-headline leading-tight">
              {hackathon.title}
            </h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto">
              {hackathon.description}
            </p>
            <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 mt-6 text-sm">
              <div className="flex items-center gap-2"><Trophy /><span>Prize: Ksh {hackathon.prizeMoney.toLocaleString()}</span></div>
              <div className="flex items-center gap-2"><span>{format(new Date(hackathon.startDate), 'PPP')} - {format(new Date(hackathon.endDate), 'PPP')}</span></div>
              <div className="flex items-center gap-2"><Users /><span>{participants.length} Participants</span></div>
            </div>
          </div>
        </section>
        <div className="container mx-auto px-4 md:px-6 py-12 -mt-16 md:-mt-20 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className="shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Trophy className="h-6 w-6 text-primary" />
                    Rules & Judging Criteria
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <p>Details about rules and how projects will be judged will be provided here. This includes information on team sizes, technology stacks, submission formats, and the specific criteria for scoring creativity, technical implementation, and impact.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-1">
              <Card className="sticky top-24 shadow-xl">
                <CardHeader>
                  <p className="text-3xl font-bold text-primary mb-2">
                    {hackathon.entryFee > 0 ? `Ksh ${hackathon.entryFee.toLocaleString()}` : 'Free'}
                  </p>
                  <CardDescription>Entry fee per participant.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isParticipant ? (
                    hasEnded ? (
                      <Button size="lg" className="w-full" disabled>Submissions Closed</Button>
                    ) : (
                      <Button size="lg" className="w-full" asChild>
                        <Link href={`/portal/hackathons/${hackathon.id}/submit`}>
                          <GitBranch className="mr-2 h-4 w-4" />
                          Submit Project
                        </Link>
                      </Button>
                    )
                  ) : (
                    <Button size="lg" className="w-full" onClick={() => hackathon.entryFee > 0 ? setIsModalOpen(true) : handleRegister()} disabled={isRegistering || hasEnded}>
                      {isRegistering ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                      {hasEnded ? 'Event has ended' : 'Register Now'}
                    </Button>
                  )}
                  {hackathon.externalUrl && (
                    <Button size="lg" className="w-full" variant="outline" asChild>
                      <a href={hackathon.externalUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Visit Event Page
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      {hackathon.entryFee > 0 && (
        <PaymentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          itemId={hackathon.id}
          itemName={hackathon.title}
          price={hackathon.entryFee}
          onPaymentSuccess={handleRegister}
        />
      )}
    </>
  );
}
