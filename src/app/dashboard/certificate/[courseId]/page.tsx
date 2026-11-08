
'use client'

import { useState, useEffect } from 'react';
import { notFound, useParams, useRouter } from "next/navigation";
import { getCourseById, getAllCourses, getUserCourses, getCertificateSettings } from "@/lib/firebase-service";
import type { Course } from "@/lib/mock-data";
import type { UserCourse } from "@/lib/types";
import { Footer } from "@/components/Footer";
import { Certificate } from "@/components/Certificate";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Loader2 } from 'lucide-react';
import { AppSidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { slugify } from '@/lib/utils';
import { LoadingAnimation } from '@/components/LoadingAnimation';

export default function CertificatePage() {
  const params = useParams<{ courseId: string }>(); // This 'courseId' is the slug
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [userCourse, setUserCourse] = useState<UserCourse | null>(null);
  const [academicDirector, setAcademicDirector] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { user, loading: loadingAuth } = useAuth();

  useEffect(() => {
    if (!loadingAuth && !user) {
      router.push('/login');
    }
  }, [user, loadingAuth, router]);

  useEffect(() => {
    const fetchCourse = async () => {
        if (!user) {
          setLoading(false);
          return;
        };
        setLoading(true);
        const allCourses = await getAllCourses();
        const courseSlug = params.courseId;
        const fetchedCourse = allCourses.find(c => slugify(c.title) === courseSlug);
        
        if (!fetchedCourse) {
            notFound();
            return;
        }
        
        const [userCoursesData, certSettings] = await Promise.all([
            getUserCourses(user.uid),
            getCertificateSettings(),
        ]);
        
        const currentUserCourse = userCoursesData.find(uc => uc.courseId === fetchedCourse.id);

        if (!currentUserCourse?.certificateAvailable) {
            notFound(); // User is not entitled to this certificate
            return;
        }

        setCourse(fetchedCourse || null);
        setUserCourse(currentUserCourse);
        setAcademicDirector(certSettings.academicDirector);
        setLoading(false);
    }
    if(!loadingAuth) {
      fetchCourse();
    }
  }, [params.courseId, user, loadingAuth]);

  if (loadingAuth || loading) {
    return <div className="flex justify-center items-center min-h-screen">
        <LoadingAnimation />
    </div>
  }
  
  if (!course || !userCourse) {
    notFound();
  }

  // In a real app, you'd verify the user is entitled to this certificate.
  // For now, we just need the user to be logged in.
  if (!user) {
    notFound();
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <div className="flex flex-col min-h-screen print:min-h-0">
          <main className="flex-grow bg-secondary print:bg-white">
            <div className="container mx-auto px-4 md:px-6 py-12 print:p-0">
                <div className='print:hidden'>
                    <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Dashboard
                    </button>
                </div>
                <Certificate 
                    course={course} 
                    userName={user.displayName || 'Student'} 
                    certificateId={userCourse.certificateId!}
                    academicDirector={academicDirector}
                />
            </div>
          </main>
          <div className="print:hidden">
            <Footer />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
