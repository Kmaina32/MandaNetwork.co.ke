

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { GitBranch, Home, LayoutDashboard, ListTodo, Calendar, User, HelpCircle, Mail, Info, UserPlus, Book, Shield, Notebook as NotebookIcon, Clapperboard, Library, Briefcase, Tag, Building, Users as PortfoliosIcon, Rocket, Trophy, Rss } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Separator } from './ui/separator';
import pkg from '../../package.json';
import { useEffect, useMemo, useState } from 'react';
import type { CalendarEvent } from '@/lib/types';
import { getAllCalendarEvents } from '@/lib/firebase-service';
import Image from 'next/image';

export function AppSidebar() {
    const pathname = usePathname();
    const { user, isAdmin, isOrganizationAdmin, organization } = useAuth();
    const { setOpenMobile } = useSidebar();
    const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
    const [readEventIds, setReadEventIds] = useState<Set<string>>(new Set());
    const [loadingEvents, setLoadingEvents] = useState(true);

    useEffect(() => {
        if (user) {
            const fetchEvents = async () => {
                try {
                    setLoadingEvents(true);
                    const events = await getAllCalendarEvents();
                    setCalendarEvents(events);
                } catch (error) {
                    console.error("Failed to fetch calendar events for sidebar", error);
                } finally {
                    setLoadingEvents(false);
                }
            };

            const storedIds = localStorage.getItem('readCalendarEventIds');
            if (storedIds) {
                setReadEventIds(new Set(JSON.parse(storedIds)));
            }
            fetchEvents();
        }
    }, [user]);

    const unreadCalendarEvents = useMemo(() => {
        if (loadingEvents || !user) return [];
        const userCreationTime = new Date(user.metadata.creationTime || 0);
        return calendarEvents.filter(event => 
            !readEventIds.has(event.id) && new Date(event.date) > userCreationTime
        );
    }, [calendarEvents, readEventIds, loadingEvents, user]);

    const isActive = (path: string) => {
        if (path === '/') return pathname === '/';
        return pathname.startsWith(path);
    }
    
    const onLinkClick = (path?: string) => {
        if (path === '/calendar' && unreadCalendarEvents.length > 0) {
            const allEventIds = new Set(calendarEvents.map(e => e.id));
            setReadEventIds(allEventIds);
            localStorage.setItem('readCalendarEventIds', JSON.stringify(Array.from(allEventIds)));
        }
        setOpenMobile(false);
    }

  return (
    <Sidebar>
        <SidebarHeader className="mb-4">
             <Link href="/" className="flex items-center gap-2">
                <GitBranch className="h-6 w-6 text-yellow-500" />
                <span className="font-bold text-lg font-headline group-data-[collapsible=icon]:hidden">Manda Network</span>
            </Link>
        </SidebarHeader>
        <SidebarContent>
            <SidebarMenu>
                 {user ? (
                    <>
                        <p className="text-xs font-semibold text-muted-foreground px-2 mb-2 group-data-[collapsible=icon]:hidden">Main Navigation</p>
                        <SidebarMenuItem>
                           <SidebarMenuButton asChild size="sm" isActive={isActive('/') && pathname==='/'} tooltip="Browse Courses" onClick={() => onLinkClick('/')}>
                                <Link href="/"><Book className="mr-2"/>Browse Courses</Link>
                           </SidebarMenuButton>
                        </SidebarMenuItem>
                         <SidebarMenuItem>
                           <SidebarMenuButton asChild size="sm" isActive={isActive('/dashboard')} tooltip="Dashboard" onClick={() => onLinkClick('/dashboard')}>
                                <Link href="/dashboard"><LayoutDashboard className="mr-2"/>Dashboard</Link>
                           </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild size="sm" isActive={isActive('/programs')} tooltip="Certificate Programs" onClick={() => onLinkClick('/programs')}>
                                <Link href="/programs"><Library className="mr-2"/>Programs</Link>
                           </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                           <SidebarMenuButton asChild size="sm" isActive={isActive('/bootcamps')} tooltip="Bootcamps" onClick={() => onLinkClick('/bootcamps')}>
                                <Link href="/bootcamps"><Rocket className="mr-2"/>Bootcamps</Link>
                           </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                           <SidebarMenuButton asChild size="sm" isActive={isActive('/portal/hackathons')} tooltip="Hackathons" onClick={() => onLinkClick('/portal/hackathons')}>
                                <Link href="/portal/hackathons"><Trophy className="mr-2"/>Hackathons</Link>
                           </SidebarMenuButton>
                        </SidebarMenuItem>
                        
                        <Separator className="my-2"/>
                        <p className="text-xs font-semibold text-muted-foreground px-2 mb-2 group-data-[collapsible=icon]:hidden">Learning Tools</p>
                         <SidebarMenuItem>
                           <SidebarMenuButton asChild size="sm" isActive={isActive('/assignments')} tooltip="My Exams" onClick={() => onLinkClick('/assignments')}>
                                <Link href="/assignments"><ListTodo className="mr-2"/>My Exams</Link>
                           </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                           <SidebarMenuButton asChild size="sm" isActive={isActive('/messages')} tooltip="Message Center" onClick={() => onLinkClick('/messages')}>
                                <Link href="/messages"><Mail className="mr-2"/>Message Center</Link>
                           </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                           <SidebarMenuButton asChild size="sm" isActive={isActive('/notebook')} tooltip="Notebook" onClick={() => onLinkClick('/notebook')}>
                                <Link href="/notebook"><NotebookIcon className="mr-2"/>Notebook</Link>
                           </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                           <SidebarMenuButton asChild size="sm" isActive={isActive('/live')} tooltip="Live Classroom" onClick={() => onLinkClick('/live')}>
                                <Link href="/live"><Clapperboard className="mr-2"/>Live Classroom</Link>
                           </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild size="sm" isActive={isActive('/calendar')} tooltip="Calendar" onClick={() => onLinkClick('/calendar')}>
                                <Link href="/calendar" className="relative">
                                    <Calendar className="mr-2"/>
                                    <span>Calendar</span>
                                     {unreadCalendarEvents.length > 0 && (
                                        <span className="absolute top-1 right-1 flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                        </span>
                                    )}
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>

                        <Separator className="my-2"/>
                        <p className="text-xs font-semibold text-muted-foreground px-2 mb-2 group-data-[collapsible=icon]:hidden">Career & Support</p>
                        <SidebarMenuItem>
                           <SidebarMenuButton asChild size="sm" isActive={isActive('/portfolios')} tooltip="Hiring Center" onClick={() => onLinkClick('/portfolios')}>
                                <Link href="/portfolios"><PortfoliosIcon className="mr-2"/>Hiring Center</Link>
                           </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                             <SidebarMenuButton asChild size="sm" isActive={isActive('/coach')} tooltip="AI Career Coach" onClick={() => onLinkClick('/coach')}>
                                <Link href="/coach"><Briefcase className="mr-2"/>Career Coach</Link>
                           </SidebarMenuButton>
                        </SidebarMenuItem>
                         <SidebarMenuItem>
                           <SidebarMenuButton asChild size="sm" isActive={isActive('/blog')} tooltip="Blog" onClick={() => onLinkClick('/blog')}>
                                <Link href="/blog"><Rss className="mr-2"/>Blog</Link>
                           </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                           <SidebarMenuButton asChild size="sm" isActive={isActive('/about')} tooltip="About Us" onClick={() => onLinkClick('/about')}>
                                <Link href="/about"><Info className="mr-2"/>About Us</Link>
                           </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                           <SidebarMenuButton asChild size="sm" isActive={isActive('/help')} tooltip="Help" onClick={() => onLinkClick('/help')}>
                                <Link href="/help"><HelpCircle className="mr-2"/>Help</Link>
                           </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                           <SidebarMenuButton asChild size="sm" isActive={isActive('/contact')} tooltip="Contact Us" onClick={() => onLinkClick('/contact')}>
                                <Link href="/contact"><Mail className="mr-2"/>Contact</Link>
                           </SidebarMenuButton>
                        </SidebarMenuItem>

                         <Separator className="my-2" />
                        <p className="text-xs font-semibold text-muted-foreground px-2 mb-2 group-data-[collapsible=icon]:hidden">Account</p>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild size="sm" isActive={isActive('/profile')} tooltip="Profile" onClick={() => onLinkClick('/profile')}>
                                <Link href="/profile"><User className="mr-2"/>My Profile</Link>
                           </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            {organization && (
                                <SidebarMenuButton asChild size="sm" isActive={isActive('/organization')} tooltip={isAdmin || isOrganizationAdmin ? "Manage Organization" : organization.name} onClick={() => onLinkClick(isAdmin || isOrganizationAdmin ? '/organization/dashboard' : '/organization/home')}>
                                    <Link href={isAdmin || isOrganizationAdmin ? '/organization/dashboard' : '/organization/home'}>
                                        <Building className="mr-2"/>
                                        <span>{isAdmin || isOrganizationAdmin ? 'Manage Organization' : organization.name}</span>
                                    </Link>
                                </SidebarMenuButton>
                            )}
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            {isAdmin && (
                                <SidebarMenuButton asChild size="sm" isActive={isActive('/admin')} tooltip="Admin Dashboard" onClick={() => onLinkClick('/admin')}>
                                    <Link href="/admin"><Shield className="mr-2"/>Admin Dashboard</Link>
                                </SidebarMenuButton>
                            )}
                        </SidebarMenuItem>
                    </>
                ) : (
                    <>
                         <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/')} tooltip="Courses" onClick={onLinkClick}>
                                <Link href="/">
                                    <Home />
                                    <span>Courses</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                         <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/programs')} tooltip="Certificate Programs" onClick={onLinkClick}>
                                <Link href="/programs">
                                    <Library />
                                    <span>Programs</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/bootcamps')} tooltip="Bootcamps" onClick={onLinkClick}>
                                <Link href="/bootcamps">
                                    <Rocket />
                                    <span>Bootcamps</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/portal/hackathons')} tooltip="Hackathons" onClick={() => onLinkClick('/portal/hackathons')}>
                                <Link href="/portal/hackathons">
                                    <Trophy />
                                    <span>Hackathons</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/portfolios')} tooltip="Hiring Center" onClick={onLinkClick}>
                                <Link href="/portfolios">
                                    <PortfoliosIcon />
                                    <span>Hiring Center</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/for-business')} tooltip="For Organizations" onClick={() => onLinkClick('/for-business')}>
                                <Link href="/for-business">
                                    <Building />
                                    <span>Organization</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                           <SidebarMenuButton asChild size="sm" isActive={isActive('/blog')} tooltip="Blog" onClick={() => onLinkClick('/blog')}>
                                <Link href="/blog"><Rss className="mr-2"/>Blog</Link>
                           </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/about')} tooltip="About Us" onClick={() => onLinkClick('/about')}>
                                <Link href="/about">
                                    <Info />
                                    <span>About Us</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/help')} tooltip="Help" onClick={() => onLinkClick('/help')}>
                                <Link href="/help">
                                    <HelpCircle />
                                    <span>Help</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/contact')} tooltip="Contact Us" onClick={() => onLinkClick('/contact')}>
                                <Link href="/contact">
                                    <Mail />
                                    <span>Contact</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </>
                )}
            </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
             <div className="flex items-center gap-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                <Tag className="h-3 w-3" />
                <span>v{pkg.version}</span>
            </div>
        </SidebarFooter>
    </Sidebar>
  );
}
