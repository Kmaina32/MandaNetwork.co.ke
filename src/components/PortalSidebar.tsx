

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { GitBranch, User, LogOut, Trophy, ExternalLink, Tag, Award } from 'lucide-react';
import pkg from '../../package.json';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { useAuth } from '@/hooks/use-auth';

export function PortalSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { logout } = useAuth();

    const isActive = (path: string) => {
        return pathname.startsWith(path);
    }
    
    const handleLogout = async () => {
        await logout();
        router.push('/');
    }

  return (
    <Sidebar>
        <SidebarHeader className="mb-4">
             <Link href="/" className="flex items-center gap-2">
                <GitBranch className="h-6 w-6 text-yellow-500" />
                <span className="font-bold text-lg font-headline group-data-[collapsible=icon]:hidden">Varban Academy</span>
            </Link>
        </SidebarHeader>
        <SidebarContent>
             <div className='px-2 py-1'>
                <p className='text-xs font-semibold text-muted-foreground group-data-[collapsible=icon]:hidden'>HACKATHON PORTAL</p>
            </div>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive('/portal/hackathons')} tooltip="Hackathons">
                        <Link href="/portal/hackathons">
                            <Trophy />
                            <span>Hackathons</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive('/portal/submissions')} tooltip="My Submissions">
                        <Link href="/portal/submissions">
                            <GitBranch />
                            <span>My Submissions</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive('/portal/leaderboard')} tooltip="Leaderboard">
                        <Link href="/portal/leaderboard">
                            <Award />
                            <span>Leaderboard</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive('/portal/profile')} tooltip="Profile">
                        <Link href="/portal/profile">
                            <User />
                            <span>My Profile</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
             <div className="px-2 mt-auto">
                 <Separator className="my-2" />
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={handleLogout} tooltip="Logout">
                        <LogOut />
                        <span>Logout</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                 <Button asChild variant="outline" className="w-full justify-start group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:h-auto group-data-[collapsible=icon]:p-2 mt-2">
                    <Link href="/">
                        <ExternalLink />
                        <span className="group-data-[collapsible=icon]:hidden">Go to main site</span>
                    </Link>
                 </Button>
            </div>
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
