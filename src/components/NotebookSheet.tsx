
'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Loader2, Download, Notebook as NotebookIcon, UploadCloud } from 'lucide-react';
import { getUserNotes, saveUserNotes } from '@/lib/firebase-service';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { GitBranch } from 'lucide-react';

interface NotesSheetProps {
    courseId: string;
    courseTitle: string;
}

const GoogleDriveIcon = ({ className }: { className?: string }) => (
    <img
        src="https://ssl.gstatic.com/images/branding/productlogos/drive_2026/v2/ico/drive_2026_256dp.ico"
        alt=""
        aria-hidden="true"
        className={className}
    />
);

export function NotebookSheet({ courseId, courseTitle }: NotesSheetProps) {
    const { user } = useAuth();
    const { toast } = useToast();

    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isClient, setIsClient] = useState(false);
    
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pdfRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setIsClient(true);
        const fetchData = async () => {
            if (!user || !courseId) return;
            setIsLoading(true);
            try {
                const notesData = await getUserNotes(user.uid, courseId);
                setNotes(notesData);
            } catch(error) {
                console.error("Failed to load notebook data:", error);
                toast({ title: 'Error', description: 'Could not load notebook data.', variant: 'destructive'});
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [user, courseId, toast]);
    
    const handleDownload = async () => {
        if (!pdfRef.current || !courseTitle || !user) return;
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
        pdf.save(`VarbanAcademy_Notes_${courseTitle.replace(/\s+/g, '_')}.pdf`);
        setIsDownloading(false);
    };

    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newNotes = e.target.value;
        setNotes(newNotes);
        
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        setIsSaving(true);
        timeoutRef.current = setTimeout(async () => {
            if (user && courseId) {
                await saveUserNotes(user.uid, courseId, newNotes);
                setIsSaving(false);
            }
        }, 1500); // Debounce save
    };
    
     const handleSaveToDrive = () => {
        const blob = new Blob([notes], { type: 'text/plain;charset=utf-8' });
        saveAs(blob, `${courseTitle}_notes.txt`);
        window.open('https://drive.google.com/drive/my-drive', '_blank');
     };
     
    if (!isClient) {
        return null;
    }

    return (
        <>
            <Sheet>
                <SheetTrigger asChild>
                    <Button className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg">
                        <NotebookIcon className="h-7 w-7" />
                    </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:w-[540px] flex flex-col p-0 rounded-l-lg">
                     <SheetHeader className="p-6 pb-2 border-b">
                        <div className="flex justify-between items-center">
                             <div>
                                <SheetTitle className="flex items-center gap-2">
                                    <NotebookIcon className="h-5 w-5"/>
                                    My Notebook
                                </SheetTitle>
                                <SheetDescription>
                                    Notes for: {courseTitle}
                                </SheetDescription>
                            </div>
                             <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={handleDownload} disabled={isDownloading}>
                                    {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                    PDF
                                </Button>
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm">
                                            <GoogleDriveIcon className="mr-2 h-4 w-4" />
                                            Save to Google Drive
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
                                                <strong className='font-semibold'>Step 1:</strong> A text file of your notes (`{courseTitle}_notes.txt`) will be downloaded to your computer.
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
                    </SheetHeader>
                     <div className="flex-grow p-2">
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
                    </div>
                     <div className="p-4 border-t text-xs text-muted-foreground text-right h-10 flex items-center justify-end">
                        {isSaving ? 'Saving...' : 'Saved'}
                    </div>
                </SheetContent>
            </Sheet>

            {/* Hidden element for PDF generation */}
            <div className="absolute -left-[9999px] top-0 opacity-0" aria-hidden="true">
                <div ref={pdfRef} className="p-10 bg-white w-[595px] text-black">
                    <div className="border-b-2 border-black pb-4 mb-4 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <GitBranch className="h-8 w-8 text-primary" />
                            <span className="font-bold text-xl font-headline">Varban Academy</span>
                        </div>
                        <div className="text-right text-xs">
                            <p className="font-semibold">{user?.displayName}</p>
                            <p>{format(new Date(), 'PPP')}</p>
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold font-headline mb-2">{courseTitle}</h1>
                    <h2 className="text-lg text-gray-600 mb-6">My Personal Notes</h2>
                    <div className="bg-gray-50 p-4 rounded-md border min-h-[600px]">
                        <pre className="whitespace-pre-wrap font-body text-sm">{notes || 'No notes taken for this session.'}</pre>
                    </div>
                        <p className="text-center text-xs text-gray-400 mt-6">
                        &copy; {new Date().getFullYear()} Varban Academy. All rights reserved.
                    </p>
                </div>
            </div>
        </>
    );
}
