
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, PlusCircle, Calendar as CalendarIcon, Loader2, Trash2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import type { CalendarEvent } from '@/lib/mock-data';
import { getAllCalendarEvents, deleteCalendarEvent } from '@/lib/firebase-service';
import { format, startOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { EventForm } from '@/components/EventForm';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { LoadingAnimation } from '@/components/LoadingAnimation';

export default function AdminCalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const fetchedEvents = await getAllCalendarEvents();
      setEvents(fetchedEvents);
    } catch (err) {
      console.error("Failed to fetch events:", err);
      toast({ title: "Error", description: "Failed to load calendar events.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

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

  const handleFormSuccess = () => {
    fetchEvents();
    setIsFormDialogOpen(false);
  };

  const handleDelete = async (eventId: string) => {
    try {
        await deleteCalendarEvent(eventId);
        toast({title: "Success", description: "Event deleted successfully."});
        fetchEvents();
    } catch(error) {
        console.error("Failed to delete event:", error);
        toast({title: "Error", description: "Failed to delete event.", variant: "destructive"});
    }
  }
  
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

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow container mx-auto px-4 md:px-6 py-12 md:py-16">
        <div className="max-w-6xl mx-auto">
             <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
               <ArrowLeft className="h-4 w-4" />
               Back to Admin Dashboard
            </Link>
            <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
              <Card>
                  <CardHeader>
                      <CardTitle>Manage Calendar</CardTitle>
                      <CardDescription>Schedule assignments, group work, one-on-ones, and other events.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      {loading ? (
                         <div className="flex justify-center items-center py-10">
                            <LoadingAnimation />
                         </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="md:col-span-2">
                                <Calendar
                                  mode="single"
                                  selected={selectedDate}
                                  onSelect={setSelectedDate}
                                  className="rounded-md border not-prose w-full"
                                  components={{
                                    Day: DayWithDot,
                                  }}
                                />
                            </div>
                            <aside className="md:col-span-1">
                                <div className="flex justify-between items-center mb-4">
                                  <h3 className="font-semibold">
                                      {selectedDate ? format(selectedDate, 'PPP') : 'Select a date'}
                                  </h3>
                                  {selectedDate && (
                                     <DialogTrigger asChild>
                                        <Button variant="outline" size="sm">
                                          <PlusCircle className="mr-2 h-4 w-4" />
                                          Add Event
                                        </Button>
                                    </DialogTrigger>
                                  )}
                                </div>
                                <div className="space-y-4">
                                  {selectedDayEvents.length > 0 ? (
                                    selectedDayEvents.map(event => (
                                      <div key={event.id} className="p-3 bg-secondary rounded-lg text-sm group relative">
                                        <p className="font-semibold">{event.title}</p>
                                        <p className="text-xs text-muted-foreground">{event.description}</p>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                                                  <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete the event titled "{event.title}".
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(event.id)}>Continue</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
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
              <DialogContent className="sm:max-w-[480px]">
                  <DialogHeader>
                      <DialogTitle>Create New Event</DialogTitle>
                      <DialogDescription>
                          Fill out the form to add a new event for {selectedDate ? format(selectedDate, 'PPP') : ''}.
                      </DialogDescription>
                  </DialogHeader>
                  {selectedDate && <EventForm
                    selectedDate={selectedDate}
                    onSuccess={handleFormSuccess}
                  />}
              </DialogContent>
            </Dialog>
        </div>
      </main>
      <Footer />
    </div>
  );
}
