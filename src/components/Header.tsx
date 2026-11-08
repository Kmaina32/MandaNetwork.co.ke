

'use client';

import Link from 'next/link';
import { User, LogOut, Bell, Calendar, Sparkles, PartyPopper, Moon, Sun, BellRing, Code, Trash2, Clapperboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from './ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from './ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Separator } from './ui/separator';
import { useEffect, useState, useMemo } from 'react';
import type { Course, CalendarEvent, Notification as DbNotification } from '@/lib/types';
import { getAllCourses, getAllCalendarEvents, getAllNotifications, getUserById, getLiveSession, saveUser, updateInvitationStatus } from '@/lib/firebase-service';
import { differenceInDays, isToday, parseISO, formatDistanceToNow } from 'date-fns';
import { usePathname, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { onValue, ref } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

type Notification = {
    id: string;
    icon: React.ElementType;
    title: string;
    description: string;
    href?: string;
    date: string;
    isLive?: boolean;
    actions?: DbNotification['actions']
};

function NotificationsPopover() {
    const { user, loading: authLoading, fetchUserData } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());
    const [isLive, setIsLive] = useState(false);
    const [isAccepting, setIsAccepting] = useState<string | null>(null);

    useEffect(() => {
        const storedIds = localStorage.getItem('readNotificationIds');
        if (storedIds) {
            setReadNotificationIds(new Set(JSON.parse(storedIds)));
        }

        // Listen for live session status changes
        const liveSessionRef = ref(db, 'webrtc-offers/live-session');
        const unsubscribe = onValue(liveSessionRef, (snapshot) => {
            setIsLive(snapshot.exists());
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            setLoading(false);
            setNotifications([]);
            return;
        };

        const generateNotifications = async () => {
            setLoading(true);
            let combinedNotifications: Notification[] = [];
            const userCreationTime = user.metadata?.creationTime ? new Date(user.metadata.creationTime) : new Date(0);
            const userProfile = await getUserById(user.uid);
            const userCohort = userProfile?.cohort;

            // 1. Fetch DB notifications
            try {
                const dbNotifications = await getAllNotifications(user.uid, userCohort);
                const formattedDbNotifications = (Array.isArray(dbNotifications) ? dbNotifications : [])
                    .filter(n => new Date(n.createdAt) > userCreationTime)
                     // Filter based on cohort or if it's a targeted notification for the user
                    .filter(n => !n.cohort || n.cohort === userCohort || n.userId === user.uid)
                    .map((n: DbNotification) => ({
                        id: `db-${n.id}`,
                        icon: n.title.includes('Live Now') ? Clapperboard : BellRing,
                        title: n.title,
                        description: n.body,
                        href: n.link || '#',
                        date: n.createdAt,
                        isLive: n.title.includes('Live Now'),
                        actions: n.actions,
                    }));
                combinedNotifications.push(...formattedDbNotifications);
            } catch (error) {
                console.error("Failed to fetch DB notifications", error);
            }

            // 2. Welcome Message
            try {
                if (differenceInDays(new Date(), userCreationTime) <= 1) {
                    combinedNotifications.push({
                        id: 'welcome',
                        icon: PartyPopper,
                        title: 'Welcome to Varban Academy!',
                        description: 'We are glad to have you here. Explore our courses.',
                        href: '/',
                        date: userCreationTime.toISOString()
                    });
                }
            } catch (error) {
                console.error("Failed to generate welcome notification", error);
            }

            // 3. New Course Alerts
            try {
                const courses = await getAllCourses();
                const recentCourses = (Array.isArray(courses) ? courses : []).filter(course =>
                    course.createdAt && new Date(course.createdAt) > userCreationTime
                );
                recentCourses.forEach(course => {
                    combinedNotifications.push({
                        id: `new-course-${course.id}`,
                        icon: Sparkles,
                        title: `New Course: ${course.title}`,
                        description: 'Check out this new course we just added.',
                        href: `/courses/${course.id}`,
                        date: course.createdAt
                    });
                });
            } catch (error) {
                console.error("Failed to generate new course notifications", error);
            }
            
            // 4. Upcoming Events
            try {
                const events = await getAllCalendarEvents();
                const upcomingEvents = (Array.isArray(events) ? events : []).filter(event => new Date(event.date) > userCreationTime);
                upcomingEvents.forEach(event => {
                     combinedNotifications.push({
                        id: `event-${event.id}`,
                        icon: Calendar,
                        title: `Upcoming: ${event.title}`,
                        description: 'An event is scheduled. Check your calendar.',
                        href: '/calendar',
                        date: event.date
                    });
                });
            } catch (error) {
                console.error("Failed to generate event notifications", error);
            }
            
            // Sort all notifications by date, descending
            combinedNotifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            setNotifications(combinedNotifications);
            setLoading(false);
        }

        generateNotifications();

    }, [user, authLoading]);
    
    const unreadNotifications = useMemo(() => notifications.filter(n => !readNotificationIds.has(n.id)), [notifications, readNotificationIds]);

    const handleOpenChange = (open: boolean) => {
        if (!open && unreadNotifications.length > 0) {
            const newReadIds = new Set(readNotificationIds);
            unreadNotifications.forEach(n => newReadIds.add(n.id));
            setReadNotificationIds(newReadIds);
            localStorage.setItem('readNotificationIds', JSON.stringify(Array.from(newReadIds)));
        }
    };
    
    const clearAllNotifications = () => {
         const allIds = new Set(notifications.map(n => n.id));
         setReadNotificationIds(allIds);
         localStorage.setItem('readNotificationIds', JSON.stringify(Array.from(allIds)));
    }

    const handleAcceptInvitation = async (payload: { inviteId: string, organizationId: string }) => {
        if (!user) return;
        setIsAccepting(payload.inviteId);
        try {
            await saveUser(user.uid, { organizationId: payload.organizationId });
            await updateInvitationStatus(payload.inviteId, 'accepted');
            toast({
                title: 'Invitation Accepted!',
                description: "You have successfully joined the organization.",
            });
            await fetchUserData(user); // Re-fetch user and org data
            setNotifications(prev => prev.filter(n => n.actions?.[0].payload.inviteId !== payload.inviteId));
            router.push('/organization/home'); // Redirect to new member dashboard
        } catch (error) {
            console.error("Failed to accept invitation:", error);
            toast({ title: 'Error', description: 'Could not accept the invitation.', variant: 'destructive'});
        } finally {
            setIsAccepting(null);
        }
    }
    
    const renderNotificationItem = (notification: Notification, isUnread: boolean) => {
        const title = notification.isLive && !isLive 
            ? notification.title.replace('Live Now', 'Live Ended') 
            : notification.title;
        
        const iconColor = notification.isLive && isLive ? 'text-red-500' : isUnread ? 'text-primary' : 'text-muted-foreground';

        const hasAction = notification.actions && notification.actions.length > 0;

        const content = (
            <div className="flex items-start gap-3 p-2">
                <notification.icon className={`h-5 w-5 ${iconColor} mt-1 flex-shrink-0`} />
                <div className="flex-grow">
                    <p className="font-semibold text-sm">{title}</p>
                    <p className="text-xs text-muted-foreground">{notification.description}</p>
                    <p className="text-xs text-muted-foreground/80 mt-1">{formatDistanceToNow(new Date(notification.date), { addSuffix: true })}</p>
                    {hasAction && (
                        <div className="flex gap-2 mt-2">
                            {notification.actions?.map((action, index) => {
                                if (action.action === 'accept_org_invite') {
                                    const inviteId = action.payload.inviteId;
                                    const organizationId = action.payload.organizationId;
                                    if (!inviteId || !organizationId) return null;
                                    return (
                                        <Button
                                            key={index}
                                            size="sm"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleAcceptInvitation({ inviteId, organizationId });
                                            }}
                                            disabled={isAccepting === inviteId}
                                        >
                                            {isAccepting === inviteId ? <Loader2 className="h-4 w-4 animate-spin"/> : action.title}
                                        </Button>
                                    );
                                }
                                if (action.action === 'open_form_dialog' && action.payload.formId) {
                                    return (
                                        <Button key={index} size="sm" onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            router.push(`/forms/${action.payload.formId}`);
                                        }}>
                                            {action.title}
                                        </Button>
                                    );
                                }
                                return null;
                            })}
                        </div>
                    )}
                </div>
            </div>
        );

        if (hasAction) {
            return (
                 <div key={notification.id} className="block hover:bg-secondary rounded-md cursor-pointer">
                    {content}
                </div>
            )
        }

        return (
            <Link href={notification.href || '#'} key={notification.id} className="block hover:bg-secondary rounded-md">
                {content}
            </Link>
        )
    }

    return (
        <Popover onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell />
                    {unreadNotifications.length > 0 && (
                        <span className="absolute top-0 right-0 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between p-3">
                    <h3 className="font-semibold">Notifications</h3>
                    <Button variant="ghost" size="sm" onClick={clearAllNotifications} disabled={notifications.length === 0}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Clear all
                    </Button>
                </div>
                <Separator />
                {loading ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
                ) : notifications.length > 0 ? (
                     <div className="max-h-96 overflow-y-auto">
                        {unreadNotifications.length > 0 && (
                            <div className="p-2">
                                <p className="text-xs font-semibold text-muted-foreground px-2 mb-1">Unread</p>
                                {unreadNotifications.map(notification => renderNotificationItem(notification, true))}
                            </div>
                        )}
                         
                         {notifications.filter(n => readNotificationIds.has(n.id)).length > 0 && (
                             <div className="p-2">
                                <p className="text-xs font-semibold text-muted-foreground px-2 mb-1">Read</p>
                                {notifications.filter(n => readNotificationIds.has(n.id)).map(notification => renderNotificationItem(notification, false))}
                            </div>
                         )}
                     </div>
                ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        No new notifications.
                    </div>
                )}
            </PopoverContent>
        </Popover>
    )
}

export function ThemeToggle() {
    const [theme, setTheme] = useState('light');

    useEffect(() => {
        const storedTheme = localStorage.getItem('theme') || 'light';
        setTheme(storedTheme);
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
            document.documentElement.style.colorScheme = 'dark';
        } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.style.colorScheme = 'light';
        }
    };
    
    return (
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
        </Button>
    )
}

export function Header({ children }: { children?: React.ReactNode }) {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();


  useEffect(() => {
      if (!loading && user && !user.emailVerified && pathname !== '/unverified') {
          router.push('/unverified');
      }
  }, [user, loading, pathname, router]);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1 && names[1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`;
    }
    return names[0]?.[0] || 'U';
  };
  
  if (children) {
      return (
        <header className="flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-6 sticky top-0 z-30">
          {children}
        </header>
      )
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center border-b border-border/80 bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/90 sm:px-5 md:px-6">
      <Link href="/" className="flex min-w-0 items-center">
        <span className="truncate font-headline text-base font-bold tracking-tight sm:text-lg">Varban Academy</span>
      </Link>
      <div className="ml-auto flex items-center gap-2">
        <div className="hidden items-center gap-2 md:flex">
        <ThemeToggle />
        {loading ? (
          <Skeleton className="h-9 w-9 rounded-full" />
        ) : user ? (
          <>
            <NotificationsPopover />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || 'User'} />
                    <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <p className="font-medium">{user.displayName || 'User'}</p>
                  <p className="text-xs font-normal text-muted-foreground">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile"><User className="mr-2 h-4 w-4" />Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Button asChild variant="outline"><Link href="/login">Log in</Link></Button>
            <Button asChild><Link href="/signup">Create account</Link></Button>
          </div>
        )}
        </div>
        <SidebarTrigger className="h-10 w-10 shrink-0 rounded-xl" aria-label="Open navigation menu" />
      </div>
    </header>
  );
}
