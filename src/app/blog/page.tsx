import Link from "next/link";
import Image from "next/image";
import { Footer } from "@/components/Footer";
import { AppSidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { adminDb } from "@/lib/firebase-admin";
import type { BlogPost } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getPublishedPosts(): Promise<BlogPost[]> {
  try {
    const snapshot = await adminDb.ref("blog").get();
    if (!snapshot.exists()) return [];
    return Object.entries(snapshot.val())
      .map(([id, post]) => ({ id, ...(post as Omit<BlogPost, "id">) }))
      .filter((post) => post.isPublished)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error("Failed to load public blog posts:", error);
    return [];
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Recently published" : format(date, "PPP");
}

function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader className="p-0">
        <Link href={`/blog/${post.slug}`} aria-label={`Read ${post.title}`}>
          <div className="relative h-48 w-full bg-muted">
            {post.imageUrl ? <Image src={post.imageUrl} alt={post.title} fill className="object-cover" /> : null}
          </div>
        </Link>
      </CardHeader>
      <CardContent className="flex-grow p-6">
        <Badge variant="secondary" className="mb-3">{post.category}</Badge>
        <CardTitle className="mb-2 font-headline text-xl">{post.title}</CardTitle>
        <CardDescription className="line-clamp-3">{post.description}</CardDescription>
        <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarDays className="h-4 w-4" /> {formatDate(post.createdAt)}
        </p>
      </CardContent>
      <CardFooter className="p-6 pt-0">
        <Button asChild className="w-full"><Link href={`/blog/${post.slug}`}>Read article</Link></Button>
      </CardFooter>
    </Card>
  );
}

export default async function BlogPage() {
  const posts = await getPublishedPosts();
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="flex-grow">
          <section className="bg-secondary/50 py-12 md:py-16">
            <div className="container mx-auto px-4 md:px-6 text-center">
              <h1 className="font-headline text-4xl font-bold md:text-5xl">Varban Academy Blog</h1>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">Ideas, practical guides and insights on digital skills, technology, learning and careers.</p>
            </div>
          </section>
          <section className="py-12 md:py-16">
            <div className="container mx-auto px-4 md:px-6">
              {posts.length ? (
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                  {posts.map((post) => <BlogCard key={post.id} post={post} />)}
                </div>
              ) : (
                <p className="py-10 text-center text-muted-foreground">There are no published articles yet. Please check back soon.</p>
              )}
            </div>
          </section>
        </main>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  );
}
