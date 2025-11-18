

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Gem, Home, LayoutDashboard, ListTodo, Calendar, User, HelpCircle, Mail, Info, KeyRound, UserPlus, Book, Shield, Notebook as NotebookIcon, Clapperboard, Library, Briefcase, Tag, Building, Users as PortfoliosIcon, Rocket, Trophy } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Separator } from '../ui/separator';
import pkg from '../../../package.json';
import { useEffect, useMemo, useState } from 'react';
import type { CalendarEvent } from '@/lib/mock-data';
import { getAllCalendarEvents } from '@/lib/firebase-service';

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
            <div className="flex items-center gap-2">
                <Gem className="h-6 w-6 text-primary" />
                <span className="font-bold text-lg font-headline group-data-[collapsible=icon]:hidden">Manda Network</span>
            </div>
        </SidebarHeader>
        <SidebarContent>
            <SidebarMenu>
                 {user ? (
                    <>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/') && pathname==='/'} tooltip="Browse Courses" onClick={() => onLinkClick('/')}>
                                <Link href="/">
                                    <Book />
                                    <span>Browse Courses</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/dashboard')} tooltip="Dashboard" onClick={() => onLinkClick('/dashboard')}>
                                <Link href="/dashboard">
                                    <LayoutDashboard />
                                    <span>Dashboard</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/programs')} tooltip="Certificate Programs" onClick={() => onLinkClick('/programs')}>
                                <Link href="/programs">
                                    <Library />
                                    <span>Programs</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/bootcamps')} tooltip="Bootcamps" onClick={() => onLinkClick('/bootcamps')}>
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
                            <SidebarMenuButton asChild isActive={isActive('/coach')} tooltip="AI Career Coach" onClick={() => onLinkClick('/coach')}>
                                <Link href="/coach">
                                    <Briefcase />
                                    <span>Career Coach</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/assignments')} tooltip="My Exams" onClick={() => onLinkClick('/assignments')}>
                                <Link href="/assignments">
                                    <ListTodo />
                                    <span>My Exams</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                         <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/notebook')} tooltip="Notebook" onClick={() => onLinkClick('/notebook')}>
                                <Link href="/notebook">
                                    <NotebookIcon />
                                    <span>Notebook</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/calendar')} tooltip="Calendar" onClick={() => onLinkClick('/calendar')}>
                                <Link href="/calendar" className="relative">
                                    <Calendar />
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
                         <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/live')} tooltip="Live Classroom" onClick={() => onLinkClick('/live')}>
                                <Link href="/live">
                                    <Clapperboard />
                                    <span>Live Classroom</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        
                        <Separator className="my-2" />

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

                         <Separator className="my-2" />

                         <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/profile')} tooltip="Profile" onClick={() => onLinkClick('/profile')}>
                                <Link href="/profile">
                                    <User />
                                    <span>Profile</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        
                        {organization && (
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={isActive('/organization')} tooltip={isAdmin || isOrganizationAdmin ? "Manage Organization" : organization.name} onClick={() => onLinkClick(isAdmin || isOrganizationAdmin ? '/organization/dashboard' : '/organization/home')}>
                                    <Link href={isAdmin || isOrganizationAdmin ? '/organization/dashboard' : '/organization/home'}>
                                        <Building />
                                        <span>{isAdmin || isOrganizationAdmin ? 'Manage Organization' : organization.name}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        )}

                        {isAdmin && (
                             <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={isActive('/admin')} tooltip="Admin Dashboard" onClick={() => onLinkClick('/admin')}>
                                    <Link href="/admin">
                                        <Shield />
                                        <span>Admin Dashboard</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        )}
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
                            <SidebarMenuButton asChild isActive={isActive('/portfolios')} tooltip="Student Portfolios" onClick={onLinkClick}>
                                <Link href="/portfolios">
                                    <PortfoliosIcon />
                                    <span>Student Portfolios</span>
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
