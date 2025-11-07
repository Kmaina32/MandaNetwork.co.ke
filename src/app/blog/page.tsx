
'use client';

import { useState, useEffect } from 'react';
import { Footer } from "@/components/Footer";
import { AppSidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Loader2, Rss } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { getAllBlogPosts } from '@/lib/firebase-service';
import type { BlogPost } from '@/lib/types';

function BlogPostCard({ post }: { post: BlogPost }) {
  return (
    <Card className="flex flex-col h-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg">
      <CardHeader className="p-0">
        <Link href={`/blog/${post.slug}`}>
          <div className="relative w-full h-48">
            <Image
              src={post.imageUrl}
              alt={post.title}
              fill
              className="object-cover"
              data-ai-hint="tech blog article"
            />
             <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        </Link>
      </CardHeader>
      <CardContent className="p-6 flex-grow">
        <Badge variant="secondary" className="mb-2">{post.category}</Badge>
        <CardTitle className="text-xl mb-2 font-headline">{post.title}</CardTitle>
        <p className="text-muted-foreground text-sm line-clamp-3">{post.description}</p>
      </CardContent>
      <CardFooter className="p-6 pt-0 flex justify-between items-center">
        <div className='text-xs text-muted-foreground'>
            <p>{post.author}</p>
            <p>{format(new Date(post.createdAt), 'PPP')}</p>
        </div>
         <Button asChild variant="outline">
            <Link href={`/blog/${post.slug}`}>Read More</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const fetchedPosts = await getAllBlogPosts();
        setPosts(fetchedPosts.filter(p => p.isPublished));
      } catch (error) {
        console.error("Failed to fetch blog posts", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="flex-grow">
          <section className="bg-secondary/50 py-12 md:py-16">
            <div className="container mx-auto px-4 md:px-6 text-center">
                <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                    <Rss className="h-10 w-10 text-primary" />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold font-headline">Manda Network Blog</h1>
                <p className="mt-4 text-lg max-w-3xl mx-auto text-muted-foreground">
                    Insights, tutorials, and career advice for the Kenyan tech ecosystem.
                </p>
            </div>
          </section>

          <section className="py-12 md:py-16">
            <div className="container mx-auto px-4 md:px-6">
              {loading ? (
                <div className="flex justify-center items-center py-10">
                  <LoadingAnimation />
                </div>
              ) : posts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {posts.map((post) => (
                    <BlogPostCard key={post.id} post={post} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <p>No blog posts available yet. Please check back soon!</p>
                </div>
              )}
            </div>
          </section>
        </main>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  );
}
