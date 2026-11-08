
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar as CalendarIcon, Loader2, ExternalLink } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { AppSidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import type { CalendarEvent } from '@/lib/mock-data';
import { getAllCalendarEvents } from '@/lib/firebase-service';
import { format, startOfDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';

export default function CalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      }
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    let active = true;
    const fetchEvents = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setLoadError(false);
      try {
        const fetchedEvents = await getAllCalendarEvents();
        if (active) setEvents(fetchedEvents);
      } catch (err) {
        console.error("Failed to fetch events:", err);
        if (active) {
          setLoadError(true);
          toast({ title: "Error", description: "Failed to load calendar events. Please try again.", variant: "destructive" });
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    if (!authLoading) void fetchEvents();
    return () => { active = false; };
  }, [user, authLoading, retryKey, toast]);

  const eventDates = useMemo(() => {
    return new Set(events.map(event => format(startOfDay(new Date(event.date)), 'yyyy-MM-dd')));
  }, [events]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    const formattedSelectedDate = format(startOfDay(selectedDate), 'yyyy-MM-dd');
    return events
        .filter(event => format(startOfDay(new Date(event.date)), 'yyyy-MM-dd') === formattedSelectedDate)
        .sort((a,b) => a.title.localeCompare(b.title));
  }, [events, selectedDate]);
  
  const DayWithDot = ({ date }: { date: Date }) => {
    const formattedDate = format(startOfDay(date), 'yyyy-MM-dd');
    const hasEvent = eventDates.has(formattedDate);
    return (
      <div className="relative flex items-center justify-center w-full h-full">
        <span>{date.getDate()}</span>
        {hasEvent && <div className="absolute bottom-1 w-1.5 h-1.5 bg-primary rounded-full"></div>}
      </div>
    );
  };
  
  const createGoogleCalendarLink = (event: CalendarEvent) => {
    const baseUrl = 'https://www.google.com/calendar/render?action=TEMPLATE';
    const title = encodeURIComponent(event.title);
    const details = encodeURIComponent(event.description);
    // Google Calendar format is YYYYMMDD
    const date = format(new Date(event.date), 'yyyyMMdd');
    const dates = `${date}/${date}`;
    
    return `${baseUrl}&text=${title}&details=${details}&dates=${dates}`;
  }
  
  if (authLoading || loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
     <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <div className="flex flex-col min-h-screen">
          <main className="flex-grow container mx-auto px-4 md:px-6 py-12 md:py-16">
            <div className="max-w-6xl mx-auto">
                <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Link>
                <Card>
                    <CardHeader className="text-center">
                        <div className="mx-auto bg-secondary p-3 rounded-full w-fit">
                            <CalendarIcon className="h-8 w-8 text-secondary-foreground" />
                        </div>
                        <CardTitle className="mt-4 text-2xl font-headline">My Calendar</CardTitle>
                        <CardDescription>Keep track of your course schedule and deadlines.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       {loadError ? (
                         <div className="flex flex-col items-center gap-3 py-10 text-center">
                           <p className="text-sm text-muted-foreground">Your calendar could not be loaded.</p>
                           <Button onClick={() => setRetryKey(value => value + 1)}>Try again</Button>
                         </div>
                        ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="md:col-span-2 flex justify-center">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={setSelectedDate}
                                    className="rounded-md border not-prose w-full max-w-md"
                                    components={{ Day: DayWithDot }}
                                />
                            </div>
                            <aside className="md:col-span-1">
                                <h3 className="font-semibold mb-4 text-lg">
                                    Events for {selectedDate ? format(selectedDate, 'PPP') : 'selected date'}
                                </h3>
                                <div className="space-y-4">
                                  {selectedDayEvents.length > 0 ? (
                                    selectedDayEvents.map(event => (
                                      <div key={event.id} className="p-3 bg-secondary rounded-lg text-sm">
                                        <p className="font-semibold">{event.title}</p>
                                        <p className="text-xs text-muted-foreground mb-2">{event.description}</p>
                                         <Button asChild variant="outline" size="sm" className="w-full">
                                            <a href={createGoogleCalendarLink(event)} target="_blank" rel="noopener noreferrer">
                                                Save to Google Calendar
                                                <ExternalLink className="ml-2 h-4 w-4" />
                                            </a>
                                        </Button>
                                      </div>
                                    ))
                                  ) : (
                                     <p className="text-sm text-muted-foreground">No events scheduled for this day.</p>
                                  )}
                                </div>
                            </aside>
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
