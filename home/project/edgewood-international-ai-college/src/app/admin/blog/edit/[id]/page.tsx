
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, notFound } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { ArrowLeft, Loader2, Rss } from 'lucide-react';
import { getBlogPostById, updateBlogPost } from '@/lib/firebase-service';
import { Switch } from '@/components/ui/switch';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import type { BlogPost } from '@/lib/types';
import { slugify } from '@/lib/utils';

const blogPostFormSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters.'),
  description: z.string().min(10, 'A short description is required.'),
  imageUrl: z.string().url('Must be a valid image URL.'),
  category: z.string().min(3, 'Category is required.'),
  content: z.string().min(50, 'Content must be at least 50 characters.'),
  isPublished: z.boolean().default(true),
});

export default function EditBlogPostPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [post, setPost] = useState<BlogPost | null>(null);

  const form = useForm<z.infer<typeof blogPostFormSchema>>({
    resolver: zodResolver(blogPostFormSchema),
  });

  useEffect(() => {
    const fetchPost = async () => {
      if (!params.id) return;
      setIsFetching(true);
      try {
        const postData = await getBlogPostById(params.id);
        if (!postData) {
          notFound();
          return;
        }
        setPost(postData);
        form.reset(postData);
      } catch (error) {
        console.error('Failed to fetch blog post:', error);
        toast({ title: 'Error', description: 'Failed to load blog post data.', variant: 'destructive' });
      } finally {
        setIsFetching(false);
      }
    };
    fetchPost();
  }, [params.id, form, toast]);

  const onSubmit = async (values: z.infer<typeof blogPostFormSchema>) => {
    if (!params.id) return;
    setIsLoading(true);
    try {
      const dataToUpdate = {
        ...values,
        slug: slugify(values.title),
        updatedAt: new Date().toISOString(),
      };
      await updateBlogPost(params.id, dataToUpdate);
      toast({
        title: 'Blog Post Updated!',
        description: `Your post "${values.title}" has been successfully updated.`,
      });
      router.push('/admin/blog');
    } catch (error) {
      console.error('Failed to update blog post:', error);
      toast({
        title: 'Error',
        description: 'Failed to update the post. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow container mx-auto px-4 md:px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <Link href="/admin/blog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Blog Posts
          </Link>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-headline flex items-center gap-2">
                <Rss />
                Edit Blog Post
              </CardTitle>
              <CardDescription>
                Update the details for this blog post.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isFetching ? (
                <div className="flex justify-center items-center py-10">
                  <LoadingAnimation />
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField control={form.control} name="title" render={({ field }) => ( <FormItem> <FormLabel>Post Title</FormLabel> <FormControl> <Input {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="category" render={({ field }) => ( <FormItem> <FormLabel>Category</FormLabel> <FormControl> <Input {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                        <FormField control={form.control} name="imageUrl" render={({ field }) => ( <FormItem> <FormLabel>Header Image URL</FormLabel> <FormControl> <Input {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                    </div>
                    
                    <FormField control={form.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Short Description</FormLabel> <FormControl> <Textarea {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="content" render={({ field }) => ( <FormItem> <FormLabel>Full Content (Markdown Supported)</FormLabel> <FormControl> <Textarea {...field} className="min-h-[250px]" /> </FormControl> <FormMessage /> </FormItem> )}/>

                    <FormField
                        control={form.control}
                        name="isPublished"
                        render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                            <FormLabel className="text-base">Publish Post</FormLabel>
                            <p className="text-sm text-muted-foreground">
                            If active, this post will be visible to the public on your blog.
                            </p>
                            </div>
                            <FormControl>
                            <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                            />
                            </FormControl>
                        </FormItem>
                        )}
                    />

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => router.push('/admin/blog')}>
                        Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                        </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
