import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { AppSidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ArrowLeft, Calendar, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { adminDb } from "@/lib/firebase-admin";
import type { BlogPost, Advertisement } from "@/lib/types";
import { BlogPostContent } from "@/components/BlogPostContent";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

async function getPublishedPost(slug: string): Promise<BlogPost | null> {
  try {
    const snapshot = await adminDb.ref("blog").orderByChild("slug").equalTo(slug).get();
    if (!snapshot.exists()) return null;
    const [id, value] = Object.entries(snapshot.val())[0] as [string, Omit<BlogPost, "id">];
    const post = { id, ...value };
    return post.isPublished ? post : null;
  } catch (error) {
    console.error("Failed to load blog post:", error);
    return null;
  }
}

async function getActivePromotions(): Promise<Advertisement[]> {
  try {
    const snapshot = await adminDb.ref("advertisements").get();
    if (!snapshot.exists()) return [];
    return Object.entries(snapshot.val())
      .map(([id, value]) => ({ id, ...(value as Omit<Advertisement, "id">) }))
      .filter((item) => item.isActive);
  } catch (error) {
    console.error("Failed to load blog promotions:", error);
    return [];
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Recently published" : format(date, "PPP");
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return { title: "Article not found | Varban Academy" };
  return {
    title: `${post.title} | Varban Academy`,
    description: post.description,
    openGraph: { title: post.title, description: post.description, images: post.imageUrl ? [post.imageUrl] : [] },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) notFound();
  const promotions = await getActivePromotions();
  const initials = post.author.split(" ").filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="flex-grow">
          <article>
            <header className="relative py-20 md:py-32">
              {post.imageUrl ? (
                <div className="absolute inset-0">
                  <Image src={post.imageUrl} alt={post.title} fill priority className="object-cover" />
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                </div>
              ) : <div className="absolute inset-0 bg-neutral-900" />}
              <div className="container relative mx-auto px-4 text-white md:px-6">
                <Link href="/blog" className="mb-4 inline-flex items-center gap-2 rounded-md bg-white/10 p-2 text-sm hover:bg-white/20">
                  <ArrowLeft className="h-4 w-4" /> Back to Blog
                </Link>
                <h1 className="max-w-4xl font-headline text-3xl font-bold leading-tight md:text-5xl">{post.title}</h1>
                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-10 w-10 border-2 border-primary"><AvatarFallback>{initials || <User className="h-4 w-4" />}</AvatarFallback></Avatar>
                    <span className="font-semibold">{post.author}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4" /><span>{formatDate(post.createdAt)}</span></div>
                </div>
              </div>
            </header>
            <div className="container mx-auto px-4 py-12 md:px-6">
              <div className="prose prose-lg mx-auto max-w-3xl dark:prose-invert">
                <BlogPostContent content={post.content} promoItems={promotions} />
              </div>
            </div>
          </article>
        </main>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  );
}
