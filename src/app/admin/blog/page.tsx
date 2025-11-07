
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Footer } from "@/components/shared/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { BlogPost } from "@/lib/types";
import { getAllBlogPosts, deleteBlogPost } from '@/lib/firebase-service';
import { Pencil, Trash2, Loader2, Rss, PlusCircle, MoreVertical } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
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
} from "@/components/ui/alert-dialog";
import { ArrowLeft } from 'lucide-react';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const fetchedPosts = await getAllBlogPosts();
      setPosts(fetchedPosts);
    } catch (err) {
      toast({ title: "Error", description: "Failed to fetch blog posts.", variant: "destructive" });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleDelete = async (post: BlogPost) => {
    try {
      await deleteBlogPost(post.id);
      toast({ title: "Success", description: `Post "${post.title}" has been deleted.` });
      fetchPosts();
    } catch (error) {
      console.error("Failed to delete post:", error);
      toast({ title: "Error", description: "Failed to delete post.", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow container mx-auto px-4 md:px-6 py-12 md:py-16">
        <div className="max-w-6xl mx-auto">
          <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Admin Dashboard
          </Link>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Rss className="h-8 w-8" />
              <div>
                <h1 className="text-3xl font-bold font-headline">Blog</h1>
                <p className="text-muted-foreground">Create and manage your articles.</p>
              </div>
            </div>
            <Button asChild>
              <Link href="/admin/blog/create">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Post
              </Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Blog Posts</CardTitle>
              <CardDescription>A list of all articles on your blog.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-10">
                  <LoadingAnimation />
                </div>
              ) : posts.length === 0 ? (
                 <div className="text-center py-10 text-muted-foreground">
                    No blog posts found.
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <Table className="hidden md:table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                        {posts.map((post) => (
                          <TableRow key={post.id}>
                            <TableCell className="font-medium">{post.title}</TableCell>
                            <TableCell>{post.category}</TableCell>
                            <TableCell>
                                <Badge variant={post.isPublished ? 'default' : 'secondary'}>
                                    {post.isPublished ? 'Published' : 'Draft'}
                                </Badge>
                            </TableCell>
                            <TableCell>{format(new Date(post.updatedAt), 'PPP')}</TableCell>
                            <TableCell className="text-right">
                              <Button asChild variant="ghost" size="icon" className="mr-2">
                                <Link href={`/admin/blog/edit/${post.id}`}>
                                  <Pencil className="h-4 w-4" />
                                </Link>
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete the blog post "{post.title}".
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(post)}>
                                      Yes, delete it
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                  {/* Mobile Card List */}
                  <div className="md:hidden space-y-4">
                     {posts.map((post) => (
                         <Card key={post.id}>
                           <CardContent className="p-4 flex justify-between items-start">
                              <div>
                                <p className="font-semibold">{post.title}</p>
                                <p className="text-sm text-muted-foreground">{post.category}</p>
                                <Badge variant={post.isPublished ? 'default' : 'secondary'} className="mt-2">
                                    {post.isPublished ? 'Published' : 'Draft'}
                                </Badge>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild><Link href={`/admin/blog/edit/${post.id}`} className="flex items-center"><Pencil className="mr-2 h-4 w-4"/> Edit Post</Link></DropdownMenuItem>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/> Delete Post</DropdownMenuItem>
                                  </AlertDialogTrigger>
                                </DropdownMenuContent>
                              </DropdownMenu>
                           </CardContent>
                         </Card>
                      ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
