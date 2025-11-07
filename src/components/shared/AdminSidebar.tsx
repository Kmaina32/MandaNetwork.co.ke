
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { GitBranch, Home, LayoutDashboard, ListTodo, Calendar, Users, ImageIcon, CreditCard, Cog, HelpCircle, ExternalLink, Bot, Bell, Clapperboard, Library, Layers, BarChart3, Tag, ShieldCheck, Building, FileText, Rocket, ChevronRight, BookCopy, Contact, Users2, Speaker, LineChart, Book, Trophy, Briefcase, Award, Megaphone, Rss } from 'lucide-react';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import pkg from '../../../package.json';

export function AdminSidebar() {
    const pathname = usePathname();
    const { isSuperAdmin } = useAuth();

    const isActive = (path: string) => {
        if (path === '/admin' && pathname === '/admin') return true;
        // Don't mark /admin as active if we are on a sub-page like /admin/courses
        if (path === '/admin' && pathname !== '/admin') return false;
        return pathname.startsWith(path);
    }

  return (
    <Sidebar>
        <SidebarHeader className="mb-4">
            <div className="flex items-center gap-2">
                <GitBranch className="h-6 w-6 text-yellow-500" />
                <span className="font-bold text-lg font-headline group-data-[collapsible=icon]:hidden">Manda Network</span>
            </div>
        </SidebarHeader>
        <SidebarContent>
            <div className='px-2 py-1'>
                <p className='text-xs font-semibold text-muted-foreground group-data-[collapsible=icon]:hidden'>ADMIN</p>
            </div>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive('/admin')} tooltip="Dashboard">
                        <Link href="/admin">
                            <LayoutDashboard />
                            <span>Dashboard</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>

                <p className='text-xs font-semibold text-muted-foreground px-2 mb-1 mt-3 group-data-[collapsible=icon]:hidden'>Content</p>
                 <SidebarMenuItem>
                     <SidebarMenuButton asChild size="sm" isActive={isActive('/admin/courses')} tooltip="Courses">
                        <Link href="/admin/courses"><BookCopy className="h-4 w-4 mr-2"/>Courses</Link>
                    </SidebarMenuButton>
                 </SidebarMenuItem>
                 <SidebarMenuItem>
                     <SidebarMenuButton asChild size="sm" isActive={isActive('/admin/blog')} tooltip="Blog">
                        <Link href="/admin/blog"><Rss className="h-4 w-4 mr-2"/>Blog</Link>
                    </SidebarMenuButton>
                 </SidebarMenuItem>
                 <SidebarMenuItem>
                     <SidebarMenuButton asChild size="sm" isActive={isActive('/admin/assignments')} tooltip="Exams & Projects">
                        <Link href="/admin/assignments"><Briefcase className="h-4 w-4 mr-2"/>Exams & Projects</Link>
                    </SidebarMenuButton>
                 </SidebarMenuItem>
                  <SidebarMenuItem>
                     <SidebarMenuButton asChild size="sm" isActive={isActive('/admin/certificates')} tooltip="Certificates">
                        <Link href="/admin/certificates"><Award className="h-4 w-4 mr-2"/>Certificates</Link>
                    </SidebarMenuButton>
                 </SidebarMenuItem>
                 <SidebarMenuItem>
                     <SidebarMenuButton asChild size="sm" isActive={isActive('/admin/programs')} tooltip="Programs">
                        <Link href="/admin/programs"><Library className="h-4 w-4 mr-2"/>Programs</Link>
                    </SidebarMenuButton>
                 </SidebarMenuItem>
                 <SidebarMenuItem>
                     <SidebarMenuButton asChild size="sm" isActive={isActive('/admin/bundles')} tooltip="Bundles">
                        <Link href="/admin/bundles"><Layers className="h-4 w-4 mr-2"/>Bundles</Link>
                    </SidebarMenuButton>
                 </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild size="sm" isActive={isActive('/admin/bootcamps')} tooltip="Bootcamps">
                        <Link href="/admin/bootcamps"><Rocket className="h-4 w-4 mr-2"/>Bootcamps</Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild size="sm" isActive={isActive('/admin/hackathons')} tooltip="Hackathons">
                        <Link href="/admin/hackathons"><Trophy className="h-4 w-4 mr-2"/>Hackathons</Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild size="sm" isActive={isActive('/admin/documents')} tooltip="Documents">
                        <Link href="/admin/documents"><FileText className="h-4 w-4 mr-2"/>Documents</Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                
                <p className='text-xs font-semibold text-muted-foreground px-2 mb-1 mt-3 group-data-[collapsible=icon]:hidden'>Audience</p>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild size="sm" isActive={isActive('/admin/users')} tooltip="Users">
                        <Link href="/admin/users"><Users2 className="h-4 w-4 mr-2"/>Users</Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                    <SidebarMenuButton asChild size="sm" isActive={isActive('/admin/organizations')} tooltip="Organizations">
                        <Link href="/admin/organizations"><Building className="h-4 w-4 mr-2"/>Organizations</Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                {isSuperAdmin && (
                     <SidebarMenuItem>
                        <SidebarMenuButton asChild size="sm" isActive={isActive('/admin/approvals')} tooltip="Approvals">
                            <Link href="/admin/approvals"><ShieldCheck className="h-4 w-4 mr-2"/>Approvals</Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                )}

                <p className='text-xs font-semibold text-muted-foreground px-2 mb-1 mt-3 group-data-[collapsible=icon]:hidden'>Engagement</p>
                <SidebarMenuItem>
                     <SidebarMenuButton asChild size="sm" isActive={isActive('/admin/live')} tooltip="Live Classroom">
                        <Link href="/admin/live"><Clapperboard className="h-4 w-4 mr-2"/>Live Classroom</Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild size="sm" isActive={isActive('/admin/notifications')} tooltip="Notifications">
                        <Link href="/admin/notifications"><Bell className="h-4 w-4 mr-2"/>Notifications</Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild size="sm" isActive={isActive('/admin/calendar')} tooltip="Calendar">
                        <Link href="/admin/calendar"><Calendar className="h-4 w-4 mr-2"/>Calendar</Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                
                <p className='text-xs font-semibold text-muted-foreground px-2 mb-1 mt-3 group-data-[collapsible=icon]:hidden'>Growth</p>
                <SidebarMenuItem>
                     <SidebarMenuButton asChild size="sm" isActive={isActive('/admin/plans')} tooltip="Pricing Plans">
                        <Link href="/admin/plans"><Tag className="h-4 w-4 mr-2"/>Pricing Plans</Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild size="sm" isActive={isActive('/admin/advertisements')} tooltip="Advertisements">
                        <Link href="/admin/advertisements"><Megaphone className="h-4 w-4 mr-2"/>Advertisements</Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild size="sm" isActive={isActive('/admin/payments')} tooltip="Payments">
                        <Link href="/admin/payments"><CreditCard className="h-4 w-4 mr-2"/>Payments</Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                     <SidebarMenuButton asChild size="sm" isActive={isActive('/admin/analytics')} tooltip="Analytics">
                        <Link href="/admin/analytics"><BarChart3 className="h-4 w-4 mr-2"/>Analytics</Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>

                <p className='text-xs font-semibold text-muted-foreground px-2 mb-1 mt-3 group-data-[collapsible=icon]:hidden'>Settings</p>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild size="sm" isActive={isActive('/admin/hero')} tooltip="Site Settings">
                        <Link href="/admin/hero"><ImageIcon className="h-4 w-4 mr-2"/>Site Settings</Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild size="sm" isActive={isActive('/admin/tutor')} tooltip="Tutor Settings">
                        <Link href="/admin/tutor"><Bot className="h-4 w-4 mr-2"/>Tutor Settings</Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild size="sm" isActive={isActive('/admin/help')} tooltip="Help Center">
                        <Link href="/admin/help"><HelpCircle className="h-4 w-4 mr-2"/>Help Center</Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
               
            </SidebarMenu>
             <div className="px-2 mt-auto">
                 <Separator className="my-2" />
                 <Button asChild variant="outline" className="w-full justify-start group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:h-auto group-data-[collapsible=icon]:p-2">
                    <Link href="/">
                        <ExternalLink />
                        <span className="group-data-[collapsible=icon]:hidden">Go to app</span>
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
