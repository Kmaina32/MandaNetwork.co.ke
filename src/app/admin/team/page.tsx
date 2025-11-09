
'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

import { getTeamMembers, updateTeamMembers, uploadImage } from '@/lib/firebase-service';
import type { TeamMember } from '@/lib/types';

import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Users, PlusCircle, Trash2, Upload } from 'lucide-react';
import Link from 'next/link';
import { LoadingAnimation } from '@/components/LoadingAnimation';

const teamMemberSchema = z.object({
  id: z.string(),
  name: z.string().min(2, "Name is required."),
  role: z.string().min(2, "Role is required."),
  description: z.string().min(10, "Description is required."),
  avatar: z.string().url("Avatar must be a valid URL."),
});

const teamFormSchema = z.object({
  members: z.array(teamMemberSchema),
});

type TeamFormValues = z.infer<typeof teamFormSchema>;

export default function AdminTeamPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: { members: [] },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "members",
  });

  useEffect(() => {
    const fetchTeam = async () => {
      setIsFetching(true);
      try {
        const teamData = await getTeamMembers();
        form.reset({ members: teamData });
      } catch (error) {
        toast({ title: "Error", description: "Failed to load team members.", variant: "destructive" });
      } finally {
        setIsFetching(false);
      }
    };
    fetchTeam();
  }, [form, toast]);
  
  const handleImageUpload = async (file: File, index: number) => {
    if (!file) return;
    setIsLoading(true);
    try {
        const downloadURL = await uploadImage(`team-avatars/${file.name}`, file);
        update(index, { ...fields[index], avatar: downloadURL });
        toast({ title: 'Avatar Updated!', description: 'The new image has been uploaded and linked.'});
    } catch (error) {
        toast({ title: 'Upload Failed', description: 'Could not upload the image.', variant: 'destructive'});
    } finally {
        setIsLoading(false);
    }
  }

  const onSubmit = async (values: TeamFormValues) => {
    setIsLoading(true);
    try {
      await updateTeamMembers(values.members);
      toast({ title: "Success!", description: "Team members have been updated." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save team members.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow container mx-auto px-4 md:px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Admin Dashboard
          </Link>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3"><Users /> Meet the Team Page</CardTitle>
                  <CardDescription>Manage the team members displayed on the "About Us" page.</CardDescription>
                </CardHeader>
                <CardContent>
                  {isFetching ? (
                    <div className="flex justify-center items-center py-10"><LoadingAnimation /></div>
                  ) : (
                    <div className="space-y-6">
                      {fields.map((field, index) => (
                        <Card key={field.id} className="p-4 relative bg-secondary/50">
                          <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive hover:text-destructive" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <div className="flex flex-col sm:flex-row items-start gap-6">
                            <div className="flex flex-col items-center gap-2 w-full sm:w-40 flex-shrink-0">
                                <Avatar className="h-40 w-40">
                                    <AvatarImage src={field.avatar} />
                                    <AvatarFallback>{field.name?.substring(0,2) || 'TM'}</AvatarFallback>
                                </Avatar>
                                <input
                                    type="file"
                                    ref={el => fileInputRefs.current[index] = el}
                                    onChange={(e) => e.target.files && handleImageUpload(e.target.files[0], index)}
                                    className="hidden"
                                    accept="image/*"
                                />
                                <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => fileInputRefs.current[index]?.click()}>
                                    <Upload className="h-3 w-3 mr-2" />
                                    Upload
                                </Button>
                            </div>
                            <div className="space-y-4 flex-grow w-full">
                               <FormField control={form.control} name={`members.${index}.name`} render={({ field }) => ( <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                               <FormField control={form.control} name={`members.${index}.role`} render={({ field }) => ( <FormItem><FormLabel>Role</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                               <FormField control={form.control} name={`members.${index}.description`} render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />
                            </div>
                          </div>
                        </Card>
                      ))}
                       <Button type="button" variant="outline" onClick={() => append({ id: uuidv4(), name: 'New Member', role: 'Role', description: 'A short description of the new team member.', avatar: 'https://placehold.co/160x160' })}>
                         <PlusCircle className="mr-2 h-4 w-4" />
                         Add Team Member
                      </Button>
                    </div>
                  )}
                </CardContent>
                <CardContent className="border-t pt-6">
                    <div className="flex justify-end">
                      <Button type="submit" disabled={isLoading || isFetching}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save Changes
                      </Button>
                    </div>
                </CardContent>
              </Card>
            </form>
          </Form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
