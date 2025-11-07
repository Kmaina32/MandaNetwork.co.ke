
'use client';

import { useState, useEffect, useRef } from 'react';
import { getPublicProfiles, getHeroData, createNotification } from '@/lib/firebase-service';
import type { RegisteredUser, Metadata } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Users, Mail, Search, Eye } from 'lucide-react';
import Link from 'next/link';
import { ContactStudentDialog } from '@/components/ContactStudentDialog';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay";
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { Input } from '@/components/ui/input';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { ProfileCompletionDialog } from '@/components/shared/ProfileCompletionDialog';
import { useToast } from '@/hooks/use-toast';

const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    return names.length > 1 && names[1] ? `${names[0][0]}${names[names.length - 1][0]}` : names[0]?.[0] || 'U';
};

const hiringFeatures = [
    {
        icon: <Search className="h-8 w-8 text-primary" />,
        title: "Browse Profiles",
        description: "Explore the public portfolios of our skilled graduates."
    },
    {
        icon: <Eye className="h-8 w-8 text-primary" />,
        title: "View Full Portfolio",
        description: "Dive deep into their projects, skills, and achievements."
    },
    {
        icon: <Mail className="h-8 w-8 text-primary" />,
        title: "Initiate Contact",
        description: "Reach out to promising candidates via our secure contact form."
    }
];

export default function PortfoliosPage() {
    const [publicProfiles, setPublicProfiles] = useState<RegisteredUser[]>([]);
    const [heroData, setHeroData] = useState<{ portfoliosImageUrl?: string }>({});
    const [loading, setLoading] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState<RegisteredUser | null>(null);
    const [dialogState, setDialogState] = useState<{ type: 'contact' | 'completion'; student: RegisteredUser | null }>({ type: 'contact', student: null });

    const autoplayPlugin = useRef(Autoplay({ delay: 5000, stopOnInteraction: true }));
    const { isOrganizationAdmin, isAdmin } = useAuth();
    const isEmployer = isOrganizationAdmin || isAdmin;
    const { toast } = useToast();

    useEffect(() => {
        const fetchPageData = async () => {
            setLoading(true);
            try {
                const [publicUsers, heroSettings] = await Promise.all([
                    getPublicProfiles(),
                    getHeroData()
                ]);
                setPublicProfiles(publicUsers);
                setHeroData(heroSettings);
            } catch (error) {
                console.error("Failed to fetch page data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPageData();
    }, []);
    
    const isProfileComplete = (student: RegisteredUser) => {
        return student.displayName && student.displayName !== 'New Member' &&
               student.portfolio?.aboutMe &&
               student.portfolio?.socialLinks?.github;
    };

    const handleContactClick = (student: RegisteredUser) => {
        if (isProfileComplete(student)) {
            setDialogState({ type: 'contact', student: student });
        } else {
            createNotification({
                userId: student.uid,
                title: "Complete Your Profile!",
                body: "An employer tried to contact you, but your portfolio is incomplete. Update it now to be discovered!",
                link: "/profile",
            });
            toast({
                title: "Profile Incomplete",
                description: "This student needs to complete their profile before they can be contacted. We've sent them a notification.",
                duration: 7000
            });
        }
    };


    return (
        <>
            <main className="flex-grow bg-secondary/30">
                <section className="relative bg-secondary/50 py-12 md:py-16">
                    <div className="container mx-auto px-4 md:px-6">
                    <div className="relative rounded-xl overflow-hidden min-h-[400px] flex items-center justify-center text-center p-4">
                        {heroData.portfoliosImageUrl && (
                            <Image
                                src={heroData.portfoliosImageUrl}
                                alt="Hiring Center"
                                fill
                                className="object-cover"
                                data-ai-hint="professionals meeting"
                            />
                        )}
                        <div className="absolute inset-0 bg-black/60"></div>
                        <div className="relative z-10 text-white">
                            <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                                <Users className="h-10 w-10 text-primary" />
                            </div>
                            <h1 className="text-4xl md:text-5xl font-bold font-headline">Hiring Center</h1>
                            <p className="mt-4 text-lg max-w-3xl mx-auto">
                                Discover talented individuals from our academy. Our students are equipped with practical, job-ready skills.
                            </p>
                        </div>
                    </div>
                </div>
                </section>

                <section className="bg-background/80 py-10">
                    <div className="container mx-auto px-4 md:px-6">
                        <Card className="max-w-4xl mx-auto shadow-none border-dashed">
                            <CardHeader>
                                <CardTitle className="text-center">How to Hire Our Talent</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Carousel
                                    plugins={[autoplayPlugin.current]}
                                    className="w-full"
                                    opts={{ align: "start", loop: true, }}
                                >
                                    <CarouselContent>
                                        {hiringFeatures.map((feature, index) => (
                                            <CarouselItem key={index} className="md:basis-1/3">
                                                <div className="p-1">
                                                    <div className="flex flex-col items-center text-center gap-2 p-4">
                                                        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary font-bold text-xl">{index + 1}</div>
                                                        {feature.icon}
                                                        <h3 className="font-semibold">{feature.title}</h3>
                                                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                                                    </div>
                                                </div>
                                            </CarouselItem>
                                        ))}
                                    </CarouselContent>
                                </Carousel>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                <section className="container mx-auto px-4 md:px-6 py-12">
                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <LoadingAnimation />
                        </div>
                    ) : publicProfiles.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {publicProfiles.map(profile => (
                                <Card key={profile.uid} className="flex flex-col">
                                    <CardHeader className="items-center text-center">
                                        <Avatar className="h-24 w-24 mb-4 border-2 border-primary">
                                            <AvatarImage src={profile.photoURL || ''} alt={profile.displayName || ''} />
                                            <AvatarFallback>{getInitials(profile.displayName)}</AvatarFallback>
                                        </Avatar>
                                        <CardTitle>{profile.displayName}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex-grow text-center">
                                        <p className="text-muted-foreground line-clamp-3">
                                            {profile.portfolio?.aboutMe || 'A passionate learner from Manda Network.'}
                                        </p>
                                    </CardContent>
                                    <CardFooter className="flex flex-col gap-2">
                                        <Button asChild className="w-full">
                                            <Link href={`/portfolio/${profile.slug}`}>
                                                <Eye className="mr-2 h-4 w-4"/>
                                                View Portfolio
                                            </Link>
                                        </Button>
                                        <Button variant="outline" className="w-full" onClick={() => handleContactClick(profile)}>
                                            <Mail className="mr-2 h-4 w-4"/>
                                            Contact
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20">
                            <p className="text-muted-foreground">No public portfolios available at the moment. Check back soon!</p>
                        </div>
                    )}
                </section>
            </main>
            {dialogState.type === 'contact' && dialogState.student && (
                 <ContactStudentDialog 
                    student={dialogState.student}
                    isOpen={true}
                    onClose={() => setDialogState({ type: 'contact', student: null })}
                 />
            )}
        </>
    );
}
