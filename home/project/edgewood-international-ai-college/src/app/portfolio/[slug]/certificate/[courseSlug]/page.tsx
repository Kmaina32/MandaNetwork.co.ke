
'use client'

import { useState, useEffect } from 'react';
import { notFound, useParams, useRouter } from "next/navigation";
import { getCourseBySlug, getUserCourses, getCertificateSettings, getUserBySlug } from "@/lib/firebase-service";
import type { Course, UserCourse, RegisteredUser } from "@/lib/types";
import { Footer } from "@/components/Footer";
import { Certificate } from "@/components/Certificate";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Loader2 } from 'lucide-react';
import { AppSidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { LoadingAnimation } from '@/components/LoadingAnimation';

export default function CertificatePage() {
  const params = useParams<{ slug: string, courseSlug: string }>();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [student, setStudent] = useState<RegisteredUser | null>(null);
  const [userCourse, setUserCourse] = useState<UserCourse | null>(null);
  const [academicDirector, setAcademicDirector] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { user: authUser, loading: loadingAuth } = useAuth();

  useEffect(() => {
    const fetchCertificateData = async () => {
        setLoading(true);
        const studentData = await getUserBySlug(params.slug as string);

        if (!studentData) {
            notFound();
            return;
        }

        const allCourses = await getAllCourses();
        const courseData = allCourses.find(c => c.slug === params.courseSlug);
        
        if (!courseData) {
            notFound();
            return;
        }
        
        const [userCoursesData, certSettings] = await Promise.all([
            getUserCourses(studentData.uid),
            getCertificateSettings(),
        ]);
        
        const currentUserCourse = userCoursesData.find(uc => uc.courseId === courseData.id);

        if (!currentUserCourse?.certificateAvailable && studentData.uid !== authUser?.uid) {
             if(!studentData.portfolio?.public) {
                notFound();
                return;
             }
        }

        setStudent(studentData);
        setCourse(courseData);
        setUserCourse(currentUserCourse || null);
        setAcademicDirector(certSettings.academicDirector);
        setLoading(false);
    }
    fetchCertificateData();
  }, [params.slug, params.courseSlug, authUser]);

  if (loadingAuth || loading) {
    return <div className="flex justify-center items-center min-h-screen">
        <LoadingAnimation />
    </div>
  }
  
  if (!course || !student || !userCourse) {
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
                        Back to Portfolio
                    </button>
                </div>
                <Certificate 
                    course={course} 
                    userName={student.displayName || 'Student'} 
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
