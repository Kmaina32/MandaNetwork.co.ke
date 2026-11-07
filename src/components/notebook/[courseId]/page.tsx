

'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Download, GitBranch, NotebookIcon, UploadCloud } from 'lucide-react';
import { AppSidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { getUserNotes, saveUserNotes, getCourseById } from '@/lib/firebase-service';
import type { Course } from '@/lib/mock-data';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const GoogleDriveIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" {...props}>
        <path d="M330.2 284.4l-15.1 26.2-70.2-121.5L200 81l130.2 203.4z" fill="#ffc107"/>
        <path d="M117.9 284.4L73 368.8l102.3-177.2L219.7 121l-101.8 163.4z" fill="#03a9f4"/>
        <path d="M375.1 368.8L440 256H199.3l-47.5 82.3 223.3.5z" fill="#4caf50"/>
    </svg>
);


export default function NotebookPage() {
  const router = useRouter();
  const params = useParams<{ courseId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [notes, setNotes] = useState('');
  const [course, setCourse] = useState<Course | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);


  useEffect(() => {
    const fetchData = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const [notesData, courseData] = await Promise.all([
                getUserNotes(user.uid, params.courseId),
                getCourseById(params.courseId)
            ]);
            setNotes(notesData);
            if (!courseData) {
                notFound();
            }
            setCourse(courseData);
        } catch(error) {
            console.error("Failed to load notebook data:", error);
            toast({ title: 'Error', description: 'Could not load notebook data.', variant: 'destructive'});
        } finally {
            setIsLoading(false);
        }
    };

    if (user && params.courseId) {
        fetchData();
    }
  }, [user, params.courseId, toast]);

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNotes = e.target.value;
    setNotes(newNotes);
    
    if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
    }

    setIsSaving(true);
    timeoutRef.current = setTimeout(async () => {
        if (user && params.courseId) {
            await saveUserNotes(user.uid, params.courseId, newNotes);
            setIsSaving(false);
        }
    }, 1500); // Debounce save
  };

  const handleDownload = async () => {
    if (!pdfRef.current || !course || !user) return;
    setIsDownloading(true);

    const canvas = await html2canvas(pdfRef.current, { scale: 2, backgroundColor: null });
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF('p', 'pt', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = imgWidth / imgHeight;

    let finalWidth = pdfWidth - 80; // with margins
    let finalHeight = finalWidth / ratio;
    
    if (finalHeight > pdfHeight - 80) {
        finalHeight = pdfHeight - 80;
        finalWidth = finalHeight * ratio;
    }

    const x = (pdfWidth - finalWidth) / 2;
    const y = (pdfHeight - finalHeight) / 2;
    
    pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
    pdf.save(`VarbanAcademy_Notes_${course.title.replace(/\s+/g, '_')}.pdf`);
    setIsDownloading(false);
  };
  
   const handleSaveToDrive = () => {
        if (!course) return;
        const blob = new Blob([notes], { type: 'text/plain;charset=utf-8' });
        saveAs(blob, `${course.title}_notes.txt`);
        // We can't automatically open the local file in the Google Drive tab,
        // but we can open the upload page for them to drag-and-drop.
        window.open('https://drive.google.com/drive/my-drive', '_blank');
  };

  if (authLoading || isLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
   
  if (!course) {
      notFound();
  }

  return (
    <>
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <div className="flex flex-col min-h-screen">
          <main className="flex-grow container mx-auto px-4 md:px-6 py-12">
            <div className="max-w-4xl mx-auto">
              <Link href="/notebook" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
                <ArrowLeft className="h-4 w-4" />
                Back to My Notebooks
              </Link>
              <Card className="h-[75vh] flex flex-col">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-2xl font-headline flex items-center gap-2">
                               <NotebookIcon className="h-6 w-6"/> My Notebook
                            </CardTitle>
                            <CardDescription>Notes for: {course.title}</CardDescription>
                        </div>
                        <div className="flex gap-2">
                             <Button variant="outline" size="sm" onClick={handleDownload} disabled={isDownloading}>
                                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                Download PDF
                            </Button>
                             <Dialog>
                                <DialogTrigger asChild>
                                     <Button variant="outline" size="sm">
                                        <GoogleDriveIcon className="mr-2 h-4 w-4" />
                                        Save to Drive
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Save to Google Drive</DialogTitle>
                                        <DialogDescription>
                                            Follow these steps to save your notes to your Google Drive.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 text-sm">
                                        <p>
                                            <strong className='font-semibold'>Step 1:</strong> A text file of your notes (`{course.title}_notes.txt`) will be downloaded to your computer.
                                        </p>
                                         <p>
                                            <strong className='font-semibold'>Step 2:</strong> A new tab will open to your Google Drive. Simply drag the downloaded file into the Google Drive window to upload it.
                                        </p>
                                    </div>
                                    <Button onClick={handleSaveToDrive} className="w-full">
                                        <UploadCloud className="mr-2 h-4 w-4" />
                                        Continue
                                    </Button>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-grow overflow-hidden p-2">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full">
                            <Loader2 className="h-6 w-6 animate-spin"/>
                        </div>
                    ) : (
                        <Textarea
                            value={notes}
                            onChange={handleNotesChange}
                            placeholder="Start typing your notes here..."
                            className="w-full h-full resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base p-4 bg-secondary/50 rounded-md"
                        />
                    )}
                </CardContent>
                <CardFooter className="p-4 border-t text-xs text-muted-foreground text-right h-12 flex items-center justify-end">
                    {isSaving ? 'Saving...' : 'Saved'}
                </CardFooter>
              </Card>
            </div>
          </main>
          <Footer />
        </div>
      </SidebarInset>
    </SidebarProvider>
      {/* Hidden element for PDF generation */}
      <div className="absolute -left-[9999px] top-0 opacity-0" aria-hidden="true">
        <div ref={pdfRef} className="p-10 bg-white w-[595px] text-black">
            <div className="border-b-2 border-black pb-4 mb-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <GitBranch className="h-8 w-8 text-yellow-500" />
                    <span className="font-bold text-xl font-headline">Varban Academy</span>
                </div>
                <div className="text-right text-xs">
                    <p className="font-semibold">{user?.displayName}</p>
                    <p>{format(new Date(), 'PPP')}</p>
                </div>
            </div>
            <h1 className="text-2xl font-bold font-headline mb-2">{course.title}</h1>
            <h2 className="text-lg text-gray-600 mb-6">My Personal Notes</h2>
            <div className="bg-gray-50 p-4 rounded-md border min-h-[600px]">
                <pre className="whitespace-pre-wrap font-body text-sm">{notes || 'No notes taken for this course.'}</pre>
            </div>
                <p className="text-center text-xs text-gray-400 mt-6">
                &copy; {new Date().getFullYear()} Varban Academy. All rights reserved.
            </p>
        </div>
    </div>
   </>
  );
}
