
'use client';

import { useState, useEffect } from 'react';
import { notFound, useParams, usePathname, useRouter } from 'next/navigation';
import { getUserById, getUserCourses, getAllCourses, getLeaderboard } from '@/lib/firebase-service';
import type { RegisteredUser, Course, UserCourse, LeaderboardEntry } from '@/lib/types';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/Sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Award, Github, Linkedin, Loader2, Twitter, ExternalLink, ArrowLeft, Mail, Briefcase, GraduationCap, Phone, MapPin, Trophy } from 'lucide-react';
import Link from 'next/link';
import { slugify } from '@/lib/utils';
import { Icon } from '@iconify/react';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { ContactStudentDialog } from '@/components/ContactStudentDialog';
import { Separator } from '@/components/ui/separator';
import * as LucideIcons from 'lucide-react';
import { achievementList } from '@/lib/achievements';
import { OrganizationSidebar } from '@/components/OrganizationSidebar';

const ADMIN_UID = 'YlyqSWedlPfEqI9LlGzjN7zlRtC2';

type CourseWithDetails = UserCourse & Partial<Course>;

const techIconMap: Record<string, string> = {
    react: 'logos:react',
    nextjs: 'logos:nextjs-icon',
    typescript: 'logos:typescript-icon',
    javascript: 'logos:javascript',
    python: 'logos:python',
    firebase: 'logos:firebase',
    tailwind: 'logos:tailwindcss-icon',
    css: 'logos:css-3',
    html: 'logos:html-5',
    nodejs: 'logos:nodejs-icon',
    docker: 'logos:docker-icon',
    kubernetes: 'logos:kubernetes',
    vue: 'logos:vue',
    angular: 'logos:angular-icon',
    svelte: 'logos:svelte-icon',
    java: 'logos:java',
    go: 'logos:go',
};

const getTechIcon = (tech: string) => {
    const key = tech.toLowerCase().replace(/ /g, '');
    return techIconMap[key] || 'lucide:file-code';
};

export default function PortfolioPage() {
    const params = useParams<{ userId: string }>();
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<RegisteredUser | null>(null);
    const [completedCourses, setCompletedCourses] = useState<CourseWithDetails[]>([]);
    const [leaderboardRank, setLeaderboardRank] = useState<{ rank: number, score: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const { user: authUser, loading: authLoading, isAdmin, isOrganizationAdmin } = useAuth();
    const [selectedStudent, setSelectedStudent] = useState<RegisteredUser | null>(null);

    const isEmployer = isOrganizationAdmin || isAdmin;

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const userData = await getUserById(params.userId as string);
                
                if (!userData || !userData.portfolio?.public) {
                    if (!authUser || (!isEmployer && authUser.uid !== userData?.uid)) {
                       notFound();
                       return;
                    }
                }
                
                setUser(userData);

                const [allCourses, leaderboardData] = await Promise.all([
                    getAllCourses(),
                    getLeaderboard()
                ]);
                
                const userRankIndex = leaderboardData.findIndex(entry => entry.userId === userData.uid);
                if (userRankIndex !== -1) {
                    setLeaderboardRank({ rank: userRankIndex + 1, score: leaderboardData[userRankIndex].score });
                }

                let coursesToDisplay: CourseWithDetails[];

                if (userData.uid === ADMIN_UID) {
                    coursesToDisplay = allCourses.map(course => ({
                        ...course,
                        courseId: course.id,
                        progress: 100,
                        completed: true,
                        certificateAvailable: true,
                        certificateId: `admin-cert-${course.id}`,
                        enrollmentDate: course.createdAt,
                    }));
                } else {
                    const userCourses = await getUserCourses(params.userId as string);
                    const courseMap = new Map(allCourses.map(c => [c.id, c]));
                    
                    coursesToDisplay = userCourses
                        .filter(c => c.certificateAvailable)
                        .map(uc => ({ ...uc, ...courseMap.get(uc.courseId) }))
                        .filter(c => c.title);
                }

                setCompletedCourses(coursesToDisplay);

            } catch (error) {
                console.error("Failed to load portfolio data", error);
            } finally {
                setLoading(false);
            }
        };
        if (!authLoading) {
            fetchData();
        }
    }, [params.userId, authUser, authLoading, isEmployer]);

    const getInitials = (name: string | null | undefined) => {
        if (!name) return 'U';
        const names = name.split(' ');
        return names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}` : names[0]?.[0] || 'U';
    };
    
    if (loading || authLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }
    
    if (!user) {
        return notFound();
    }
    
    const achievementsToDisplay = user.uid === ADMIN_UID
        ? Object.values(achievementList)
        : Object.values(user.achievements || {});

    const IconComponent = ({ name, ...props }: { name: string } & LucideIcons.LucideProps) => {
        const LucideIcon = (LucideIcons as any)[name];
        if (!LucideIcon) return <Award {...props} />; // Fallback icon
        return <LucideIcon {...props} />;
    };

    return (
        <>
        <SidebarProvider>
            {isEmployer ? <OrganizationSidebar /> : <AppSidebar />}
            <SidebarInset>
                <Header />
                <div className="flex flex-col min-h-screen bg-secondary">
                    <main className="flex-grow container mx-auto px-4 md:px-6 py-12">
                        <div className="max-w-4xl mx-auto">
                             <Link href="/portfolios" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
                                <ArrowLeft className="h-4 w-4" />
                                Back to Hiring Center
                            </Link>
                            <Card className="mb-8 p-6 md:p-8">
                               <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                                 <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-primary">
                                    <AvatarImage src={user.photoURL || ''} alt={user.displayName || ''}/>
                                    <AvatarFallback className="text-4xl">{getInitials(user.displayName)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-grow">
                                    <h1 className="text-3xl md:text-4xl font-bold font-headline">{user.displayName}</h1>
                                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1 text-muted-foreground mt-2 text-sm">
                                        {user.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4"/>{user.email}</div>}
                                        {user.portfolio?.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4"/>{user.portfolio.phone}</div>}
                                        {user.portfolio?.address?.country && <div className="flex items-center gap-2"><MapPin className="h-4 w-4"/>{user.portfolio.address.poBox}, {user.portfolio.address.country}</div>}
                                    </div>
                                    <div className="flex items-center justify-center md:justify-start gap-4 mt-4">
                                        <div className="flex gap-1">
                                            {user.portfolio?.socialLinks?.github && <Button asChild variant="ghost" size="icon"><a href={user.portfolio.socialLinks.github} target="_blank" rel="noreferrer"><Icon icon="mdi:github" className="h-5 w-5" /></a></Button>}
                                            {user.portfolio?.socialLinks?.gitlab && <Button asChild variant="ghost" size="icon"><a href={user.portfolio.socialLinks.gitlab} target="_blank" rel="noreferrer"><Icon icon="mdi:gitlab" className="h-5 w-5" /></a></Button>}
                                            {user.portfolio?.socialLinks?.bitbucket && <Button asChild variant="ghost" size="icon"><a href={user.portfolio.socialLinks.bitbucket} target="_blank" rel="noreferrer"><Icon icon="mdi:bitbucket" className="h-5 w-5" /></a></Button>}
                                        </div>
                                        <Button onClick={() => setSelectedStudent(user)}>
                                            <Mail className="mr-2 h-4 w-4" /> Contact
                                        </Button>
                                    </div>
                                </div>
                               </div>
                               {user.portfolio?.aboutMe && (
                                   <>
                                     <Separator className="my-6"/>
                                     <div>
                                        <h3 className="font-semibold text-lg mb-2">About Me</h3>
                                        <p className="text-muted-foreground text-sm">{user.portfolio.aboutMe}</p>
                                     </div>
                                   </>
                               )}
                            </Card>

                             {leaderboardRank && (
                                <Card className="mb-8 bg-primary/10 border-primary/20">
                                    <CardHeader className="text-center">
                                        <div className="mx-auto bg-primary/20 p-3 rounded-full w-fit mb-2">
                                            <Trophy className="h-8 w-8 text-primary" />
                                        </div>
                                        <CardTitle className="font-headline">Community Leaderboard</CardTitle>
                                        <CardDescription>
                                            Ranked <span className="font-bold text-primary">#{leaderboardRank.rank}</span> with a score of <span className="font-bold text-primary">{leaderboardRank.score}</span>
                                        </CardDescription>
                                    </CardHeader>
                                </Card>
                            )}


                            {user.portfolio?.workExperience && user.portfolio.workExperience.length > 0 && (
                                <Card className="mb-8">
                                    <CardHeader><CardTitle className="flex items-center gap-3"><Briefcase /> Work Experience</CardTitle></CardHeader>
                                    <CardContent className="space-y-6">
                                        {user.portfolio.workExperience.map((exp, index) => (
                                            <div key={exp.id}>
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="font-semibold">{exp.jobTitle}</h3>
                                                        <p className="text-sm text-muted-foreground">{exp.companyName}</p>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">{exp.startDate} - {exp.endDate}</p>
                                                </div>
                                                {exp.description && <p className="text-sm mt-2">{exp.description}</p>}
                                                {index < user.portfolio!.workExperience!.length - 1 && <Separator className="mt-6"/>}
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            )}

                             {user.portfolio?.education && user.portfolio.education.length > 0 && (
                                <Card className="mb-8">
                                    <CardHeader><CardTitle className="flex items-center gap-3"><GraduationCap /> Education</CardTitle></CardHeader>
                                    <CardContent className="space-y-6">
                                        {user.portfolio.education.map((edu, index) => (
                                            <div key={edu.id}>
                                                 <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="font-semibold">{edu.institution}</h3>
                                                        <p className="text-sm text-muted-foreground">{edu.degree}, {edu.fieldOfStudy}</p>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">{edu.graduationYear}</p>
                                                </div>
                                                 {index < user.portfolio!.education!.length - 1 && <Separator className="mt-6"/>}
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            )}

                             {user.portfolio?.projects && user.portfolio.projects.length > 0 && (
                                <Card className="mb-8">
                                    <CardHeader>
                                        <CardTitle>Featured Projects</CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {user.portfolio.projects.map(project => (
                                            <Card key={project.id} className="overflow-hidden flex flex-col">
                                                <Image src={project.imageUrl} alt={project.title} width={400} height={250} className="w-full h-40 object-cover" />
                                                <div className="p-4 flex-grow flex flex-col">
                                                    <h3 className="font-semibold">{project.title}</h3>
                                                    <p className="text-sm text-muted-foreground mt-1 flex-grow">{project.description}</p>
                                                    <div className="flex flex-wrap gap-2 mt-4">
                                                        {project.technologies.map(tech => (
                                                            <Badge key={tech} variant="secondary" className="flex items-center gap-1.5">
                                                                <Icon icon={getTechIcon(tech)} className="h-3.5 w-3.5" />
                                                                {tech}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                                <CardFooter className="flex gap-2">
                                                    {project.sourceUrl && <Button asChild size="sm" variant="outline"><a href={project.sourceUrl} target="_blank" rel="noreferrer"><Icon icon="mdi:github" className="mr-2 h-4 w-4" />Source</a></Button>}
                                                    {project.liveUrl && <Button asChild size="sm"><a href={project.liveUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Live Demo</a></Button>}
                                                </CardFooter>
                                            </Card>
                                        ))}
                                    </CardContent>
                                </Card>
                            )}

                            <Card className="mb-8">
                                <CardHeader>
                                    <CardTitle>Achievements &amp; Awards</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {achievementsToDisplay.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {achievementsToDisplay.map((ach: any) => (
                                                <div key={ach.id || ach.name} className="flex items-center gap-4 p-3 rounded-lg border bg-background">
                                                    <div className="p-2 bg-primary/10 rounded-full">
                                                        <IconComponent name={ach.icon} className="h-6 w-6 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold">{ach.name}</p>
                                                        <p className="text-sm text-muted-foreground">{ach.description}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground text-center py-8">No achievements unlocked yet.</p>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Completed Courses &amp; Certificates</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {completedCourses.length > 0 ? (
                                        <div className="space-y-4">
                                            {completedCourses.map(course => (
                                                <div key={course.courseId} className="flex items-center justify-between p-4 border rounded-lg bg-background">
                                                    <div className="flex items-center gap-4">
                                                        <Award className="h-8 w-8 text-primary"/>
                                                        <div>
                                                            <h3 className="font-semibold">{course.title}</h3>
                                                            <p className="text-sm text-muted-foreground">Instructor: {course.instructor}</p>
                                                        </div>
                                                    </div>
                                                     {course.title && (
                                                        <Button asChild variant="outline">
                                                            <Link href={`/dashboard/certificate/${slugify(course.title)}`}>
                                                                View Certificate
                                                            </Link>
                                                        </Button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground text-center py-8">This user has not earned any certificates yet.</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </main>
                    <Footer />
                </div>
            </SidebarInset>
        </SidebarProvider>
        {selectedStudent && (
             <ContactStudentDialog 
                student={selectedStudent}
                isOpen={!!selectedStudent}
                onClose={() => setSelectedStudent(null)}
             />
        )}
        </>
    )
}
