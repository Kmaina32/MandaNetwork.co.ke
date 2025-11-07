
'use client';

import { useState, useEffect } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import { Footer } from "@/components/Footer";
import { AppSidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Loader2, ArrowLeft, Calendar, User } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { getBlogPostBySlug, getAllCourses, getAllBootcamps, getAllHackathons } from '@/lib/firebase-service';
import type { BlogPost, Course, Bootcamp, Hackathon } from '@/lib/types';
import { BlogPostContent } from '@/components/BlogPostContent';

export default function BlogPostPage() {
    const params = useParams<{ slug: string }>();
    const router = useRouter();
    const [post, setPost] = useState<BlogPost | null>(null);
    const [promoItems, setPromoItems] = useState<(Course | Bootcamp | Hackathon)[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPostAndPromos = async () => {
            if (!params.slug) return;
            setLoading(true);
            try {
                const [foundPost, courses, bootcamps, hackathons] = await Promise.all([
                    getBlogPostBySlug(params.slug as string),
                    getAllCourses(),
                    getAllBootcamps(),
                    getAllHackathons(),
                ]);

                if (!foundPost) {
                    notFound();
                    return;
                }
                setPost(foundPost);
                setPromoItems([...courses, ...bootcamps, ...hackathons]);

            } catch(error) {
                console.error("Failed to fetch data:", error);
                // Handle error appropriately
            } finally {
                setLoading(false);
            }
        }
        fetchPostAndPromos();
    }, [params.slug]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <LoadingAnimation />
            </div>
        )
    }

    if (!post) {
        return notFound();
    }
    
    return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="flex-grow">
            <article>
                <header className="relative py-20 md:py-32">
                    <div className="absolute inset-0">
                        <Image
                            src={post.imageUrl}
                            alt={post.title}
                            fill
                            priority
                            className="object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    </div>
                     <div className="container mx-auto px-4 md:px-6 relative text-white">
                        <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm mb-4 bg-white/10 p-2 rounded-md hover:bg-white/20">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Blog
                        </button>
                        <h1 className="text-3xl md:text-5xl font-bold font-headline leading-tight max-w-4xl">{post.title}</h1>
                         <div className="flex items-center gap-4 mt-6">
                            <div className="flex items-center gap-2">
                                <Avatar className="h-10 w-10 border-2 border-primary">
                                    {/* Placeholder for author avatar */}
                                    <AvatarFallback>{post.author.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="font-semibold">{post.author}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4"/>
                                <span>{format(new Date(post.createdAt), 'PPP')}</span>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="container mx-auto px-4 md:px-6 py-12">
                    <div className="prose prose-lg dark:prose-invert max-w-3xl mx-auto">
                       <BlogPostContent content={post.content} promoItems={promoItems} />
                    </div>
                </div>
            </article>
        </main>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
    );
}
