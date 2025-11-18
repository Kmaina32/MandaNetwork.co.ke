

'use client';

import Link from 'next/link';
import { User, LogOut, Bell, Calendar, Sparkles, PartyPopper, GitBranch, Moon, Sun, BellRing, Code, Trash2, Clapperboard, FilePen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger, useSidebar } from '../ui/sidebar';
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
import { Skeleton } from '../ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Separator } from '../ui/separator';
import { useEffect, useState, useMemo } from 'react';
import type { Course, CalendarEvent, Notification as DbNotification } from '@/lib/types';
import { getAllCourses, getAllCalendarEvents, getAllNotifications, getUserById, getLiveSession, saveUser, updateInvitationStatus, logPageVisit, getHeroData } from '@/lib/firebase-service';
import { differenceInDays, isToday, parseISO, formatDistanceToNow } from 'date-fns';
import { usePathname, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { onValue, ref } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormDialog } from '../FormDialog';

type Notification = {
    id: string;
    icon: React.ElementType;
    title: string;
    description: string;
    href?: string;
    date: string;
    isLive?: boolean;
    actions?: Array<{
        title: string;
        action: 'accept_org_invite' | 'open_form_dialog';
        payload: {
            inviteId?: string;
            organizationId?: string;
            formId?: string;
        };
    }>
};

function NotificationsPopover({ onOpenFormDialog }: { onOpenFormDialog: (formId: string) => void }) {
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
            const userCreationTime = user.metadata.creationTime ? new Date(user.metadata.creationTime) : new Date(0);
            const userProfile = await getUserById(user.uid);
            const userCohort = userProfile?.cohort;

            try {
                const dbNotifications = await getAllNotifications();
                const formattedDbNotifications = dbNotifications
                    .filter(n => new Date(n.createdAt) > userCreationTime)
                    .filter(n => !n.cohort || n.cohort === userCohort || n.userId === user.uid)
                    .map((n: DbNotification): Notification => ({
                        id: `db-${n.id}`,
                        icon: n.title.includes('Live Now') ? Clapperboard : n.actions?.[0]?.action === 'open_form_dialog' ? FilePen : BellRing,
                        title: n.title,
                        description: n.body as string,
                        href: n.link || '#',
                        date: n.createdAt,
                        isLive: n.title.includes('Live Now'),
                        actions: n.actions,
                    }));
                combinedNotifications.push(...formattedDbNotifications);
            } catch (error) {
                console.error("Failed to fetch DB notifications", error);
            }

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
            await fetchUserData(user);
            setNotifications(prev => prev.filter(n => n.actions?.[0].payload.inviteId !== payload.inviteId));
            router.push('/organization/home');
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
                            {notification.actions?.map((action, index) => (
                                <Button 
                                    key={index} 
                                    size="sm" 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (action.action === 'accept_org_invite' && action.payload.inviteId && action.payload.organizationId) {
                                            handleAcceptInvitation(action.payload as { inviteId: string; organizationId: string });
                                        } else if (action.action === 'open_form_dialog' && action.payload.formId) {
                                            onOpenFormDialog(action.payload.formId);
                                        }
                                    }}
                                    disabled={isAccepting === action.payload.inviteId}
                                >
                                    {isAccepting === action.payload.inviteId ? <Loader2 className="h-4 w-4 animate-spin"/> : action.title}
                                </Button>
                            ))}
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

function ThemeToggle() {
    const [theme, setTheme] = useState('dark');

    useEffect(() => {
        setTheme('dark');
    }, []);
    
    return (
        <Button variant="ghost" size="icon" disabled>
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-100 transition-all dark:rotate-0 dark:scale-0" />
            <span className="sr-only">Toggle theme (disabled)</span>
        </Button>
    )
}

export function Header({ children }: { children?: React.ReactNode }) {
  const { user, logout, loading } = useAuth();
  const { isMobile } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const [activityTrackingEnabled, setActivityTrackingEnabled] = useState(false);
  const [formDialogState, setFormDialogState] = useState<{ isOpen: boolean; formId: string | null }>({ isOpen: false, formId: null });

  useEffect(() => {
    getHeroData().then(settings => {
      setActivityTrackingEnabled(settings.activityTrackingEnabled || false);
    });

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'mkenya-skilled-activity-tracking') {
        setActivityTrackingEnabled(event.newValue === 'true');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
      if (!loading && user) {
          if (!user.emailVerified && pathname !== '/unverified') {
              router.push('/unverified');
          }
          if (activityTrackingEnabled) {
              logPageVisit(user.uid, pathname);
          }
      }
  }, [user, loading, pathname, router, activityTrackingEnabled]);

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
    <>
        <header className="flex h-16 items-center border-b bg-background px-4 md:px-6 sticky top-0 z-30">
            <div className="flex items-center gap-2">
                <SidebarTrigger />
                <div className={cn("md:hidden", isMobile ? "block" : "hidden")}>
                    <Link href="/" className="flex items-center gap-2 font-bold text-lg font-headline">
                        <GitBranch className="h-6 w-6 text-primary" />
                        <span>Manda Network</span>
                    </Link>
                </div>
            </div>
        
            <div className="flex w-full items-center justify-end gap-2">
                <ThemeToggle />
                {loading ? (
                <Skeleton className="h-8 w-8 rounded-full" />
                ) : user ? (
                <>
                    <NotificationsPopover onOpenFormDialog={(formId) => setFormDialogState({ isOpen: true, formId })} />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <Avatar className="h-8 w-8">
                            <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || 'User'}/>
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
                                <Link href="/profile">
                                <User className="mr-2 h-4 w-4" />
                                <span>Profile</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={logout}>
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Logout</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </>
                ) : (
                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline">
                            <Link href="/login">Login</Link>
                        </Button>
                        <Button asChild>
                            <Link href="/signup">Sign Up</Link>
                        </Button>
                    </div>
                )}
            </div>
        </header>
        <FormDialog
            isOpen={formDialogState.isOpen}
            formId={formDialogState.formId}
            onClose={() => setFormDialogState({ isOpen: false, formId: null })}
        />
    </>
  );
}

    
