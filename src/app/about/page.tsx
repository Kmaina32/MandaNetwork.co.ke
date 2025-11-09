
'use client';

import { useState, useEffect } from 'react';
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Info, Users, Target, BookOpen, Lightbulb, UserCheck } from "lucide-react";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/Sidebar';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getTeamMembers } from '@/lib/firebase-service';
import type { TeamMember } from '@/lib/types';
import { LoadingAnimation } from '@/components/LoadingAnimation';

export default function AboutPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeam = async () => {
      setLoading(true);
      const members = await getTeamMembers();
      setTeamMembers(members);
      setLoading(false);
    };
    fetchTeam();
  }, []);

  return (
    <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
            <Header />
            <div className='flex flex-col min-h-screen'>
              <main className="flex-grow p-4 md:p-8 bg-secondary/50">
                <div className="container mx-auto">
                    <Card className="w-full text-center mb-8 shadow-lg">
                    <CardHeader>
                        <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                            <Users className="h-10 w-10 text-primary" />
                        </div>
                        <CardTitle className="text-3xl md:text-4xl font-headline">About Manda Network</CardTitle>
                        <CardDescription className="text-lg text-muted-foreground">Empowering Kenya's Future with Practical, Modern Skills.</CardDescription>
                    </CardHeader>
                    <CardContent className='flex flex-col items-center gap-6 text-left'>
                        <p className="text-foreground max-w-3xl mx-auto text-center">
                        Manda Network is a premier online learning platform dedicated to providing high-quality, affordable, and accessible education tailored for the Kenyan market. We believe in the power of knowledge to transform lives and drive economic growth. Our mission is to equip individuals with the practical skills needed to thrive in today's dynamic job market.
                        </p>
                    </CardContent>
                    </Card>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
                        <Card>
                            <CardHeader className="flex flex-row items-start gap-4">
                                <div className="bg-primary/10 p-3 rounded-md mt-1">
                                    <Target className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">Our Mission</h3>
                                    <p className="text-sm text-muted-foreground">To provide accessible, industry-relevant courses that empower Kenyans to achieve their career goals and build a prosperous future.</p>
                                </div>
                            </CardHeader>
                        </Card>
                         <Card>
                             <CardHeader className="flex flex-row items-start gap-4">
                                 <div className="bg-primary/10 p-3 rounded-md mt-1">
                                    <Lightbulb className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">Our Vision</h3>
                                    <p className="text-sm text-muted-foreground">To be the leading career development platform in East Africa, recognized for quality, innovation, and positive social impact.</p>
                                </div>
                            </CardHeader>
                        </Card>
                         <Card>
                             <CardHeader className="flex flex-row items-start gap-4">
                                 <div className="bg-primary/10 p-3 rounded-md mt-1">
                                    <UserCheck className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">Our Values</h3>
                                    <p className="text-sm text-muted-foreground">We are committed to integrity, student success, continuous innovation, and building a strong community.</p>
                                </div>
                            </CardHeader>
                        </Card>
                    </div>

                     <Card className="text-center">
                        <CardHeader>
                            <CardTitle className="font-headline text-3xl">Meet the Team</CardTitle>
                            <CardDescription>The passionate individuals driving our mission forward.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {loading ? (
                            <div className="flex justify-center items-center py-10"><LoadingAnimation /></div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {teamMembers.map(member => (
                                    <div key={member.id} className="flex flex-col items-center">
                                        <Avatar className="w-40 h-40 mb-4 border-4 border-primary/20">
                                            <AvatarImage src={member.avatar} alt={member.name} />
                                            <AvatarFallback>{member.name.substring(0,2)}</AvatarFallback>
                                        </Avatar>
                                        <h4 className="font-semibold text-lg">{member.name}</h4>
                                        <p className="text-primary font-medium">{member.role}</p>
                                        <p className="text-sm text-muted-foreground mt-2 text-center">{member.description}</p>
                                    </div>
                                ))}
                            </div>
                          )}
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
