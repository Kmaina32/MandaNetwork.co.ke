

'use client'

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Footer } from "@/components/Footer";
import { CourseCard } from "@/components/CourseCard";
import type { Course } from "@/lib/mock-data";
import { getAllCourses, getHeroData, getUserCourses } from '@/lib/firebase-service';
import { Loader2, Search, ArrowLeft, ArrowRight } from 'lucide-react';
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { LoadingAnimation } from '@/components/LoadingAnimation';

const COURSES_PER_PAGE = 6;

export default function Home() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [userCourses, setUserCourses] = useState<UserCourse[]>([]);
  const [heroData, setHeroData] = useState({ title: '', subtitle: '', imageUrl: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Effect for fetching public data (courses and hero)
  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        setLoading(true);
        const [coursesData, hero] = await Promise.all([getAllCourses(), getHeroData()]);
        setCourses(coursesData);
        setHeroData(hero);
      } catch (err) {
        console.error(err);
        setError("Failed to load page content. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchPublicData();
  }, []);

  // The root route is the public marketing and course-discovery landing page.
  // Authenticated learners and administrators have dedicated workspaces.
  useEffect(() => {
    if (authLoading || !user) return;
    router.replace(isAdmin ? '/admin' : '/dashboard');
  }, [authLoading, user, isAdmin, router]);

  const filteredCourses = useMemo(() => {
    return courses.filter(course => course.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [courses, searchQuery]);

  // Pagination logic
  const totalPages = Math.ceil(filteredCourses.length / COURSES_PER_PAGE);
  const paginatedFeaturedCourses = useMemo(() => {
    const startIndex = (currentPage - 1) * COURSES_PER_PAGE;
    const endIndex = startIndex + COURSES_PER_PAGE;
    return filteredCourses.slice(startIndex, endIndex);
  }, [filteredCourses, currentPage]);

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  }
  
  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  }
  
  useEffect(() => {
      setCurrentPage(1); // Reset to first page on search
  }, [searchQuery]);


  if (authLoading || user) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><LoadingAnimation /></div>;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="flex-grow">
          <section className="relative py-12 md:py-16 bg-secondary/50">
            <div className="container mx-auto px-4 md:px-6">
              <div
                className="relative rounded-xl overflow-hidden min-h-[400px] flex items-center justify-center text-center"
              >
                {heroData.imageUrl && (
                    <Image
                        src={heroData.imageUrl}
                        alt="Hero background"
                        fill
                        priority
                        className="object-cover"
                        data-ai-hint="abstract background"
                    />
                )}
                <div className="absolute inset-0 bg-black/50"></div>
                <div className="relative z-10 h-full flex flex-col items-center justify-center text-white p-4">
                    <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight font-headline break-words">
                    {heroData.title}
                    </h1>
                    <p className="text-lg md:text-xl max-w-3xl mx-auto break-words">
                    {heroData.subtitle}
                    </p>
                </div>
              </div>
            </div>
          </section>

          <section className="py-8 md:py-12 bg-background">
            <div className="container mx-auto px-4 md:px-6">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold font-headline">Find Your Next Course</h2>
                 <p className="text-muted-foreground mt-2">Explore our growing catalog of courses.</p>
                <div className="relative w-full max-w-md mx-auto mt-4">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search all courses..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              {error ? (
                <p className="text-destructive text-center">{error}</p>
              ) : loading ? (
                <div className="flex justify-center items-center py-10">
                  <LoadingAnimation />
                </div>
              ) : (
                <>
                  {paginatedFeaturedCourses.length > 0 && (
                     <div>
                        <h3 className="text-2xl font-bold font-headline text-center mb-8">Featured Courses</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {paginatedFeaturedCourses.map((course) => (
                                <CourseCard 
                                    key={course.id} 
                                    course={course} 
                                    isEnrolled={false}
                                />
                            ))}
                        </div>
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-4 mt-12">
                                <Button onClick={handlePrevPage} disabled={currentPage === 1} variant="outline">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Previous
                                </Button>
                                <span className="text-sm text-muted-foreground">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <Button onClick={handleNextPage} disabled={currentPage === totalPages} variant="outline">
                                    Next
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        )}
                     </div>
                  )}

                  {filteredCourses.length === 0 && (
                    <div className="text-center text-muted-foreground py-10">
                      <p>No courses found{searchQuery ? ` that match "${searchQuery}"` : ''}.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </main>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  );
}
