
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, User as UserIcon, Camera, Upload, Eye, Share2, PlusCircle, Trash2, Wand2 } from 'lucide-react';
import { AppSidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { updateProfile } from 'firebase/auth';
import { uploadImage, saveUser, getUserById } from '@/lib/firebase-service';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription as AlertDescriptionComponent } from '@/components/ui/alert';
import { auth } from '@/lib/firebase';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type { RegisteredUser, PortfolioProject } from '@/lib/types';
import { Icon } from '@iconify/react';
import { Separator } from '@/components/ui/separator';
import { getPortfolioFeedback } from '@/app/actions';
import { slugify } from '@/lib/utils';
import { LoadingAnimation } from '@/components/LoadingAnimation';

const projectSchema = z.object({
  id: z.string(),
  title: z.string().min(3, "Title is required."),
  description: z.string().min(10, "Description is required."),
  imageUrl: z.string().url("Image URL is required."),
  liveUrl: z.string().url().optional().or(z.literal('')),
  sourceUrl: z.string().url().optional().or(z.literal('')),
  technologies: z.array(z.string()).min(1, "At least one technology is required."),
});

const workExperienceSchema = z.object({
    id: z.string(),
    jobTitle: z.string().min(2, "Job title is required."),
    companyName: z.string().min(2, "Company name is required."),
    startDate: z.string().min(4, "Start date is required."),
    endDate: z.string(), // Can be "Present" or a year
    description: z.string().optional(),
});

const educationSchema = z.object({
    id: z.string(),
    institution: z.string().min(2, "Institution name is required."),
    degree: z.string().min(2, "Degree or certificate is required."),
    fieldOfStudy: z.string().min(2, "Field of study is required."),
    graduationYear: z.string().min(4, "Graduation year is required."),
});

const profileFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required.'),
  aboutMe: z.string().optional(),
  phone: z.string().optional(),
  poBox: z.string().optional(),
  country: z.string().optional(),
  github: z.string().url({ message: 'Must be a valid URL.' }).optional().or(z.literal('')),
  gitlab: z.string().url({ message: 'Must be a valid URL.' }).optional().or(z.literal('')),
  bitbucket: z.string().url({ message: 'Must be a valid URL.' }).optional().or(z.literal('')),
  public: z.boolean().default(false),
  projects: z.array(projectSchema).optional(),
  workExperience: z.array(workExperienceSchema).optional(),
  education: z.array(educationSchema).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const splitDisplayName = (displayName: string | null | undefined): {firstName: string, middleName: string, lastName: string} => {
    if (!displayName) return { firstName: '', middleName: '', lastName: '' };
    const parts = displayName.split(' ');
    const firstName = parts[0] || '';
    const lastName = parts.length > 1 ? parts[parts.length - 1] : '';
    const middleName = parts.slice(1, -1).join(' ');
    return { firstName, middleName, lastName };
}


export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, logout, setUser, isAdmin, isOrganizationAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraDialogOpen, setIsCameraDialogOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dbUser, setDbUser] = useState<RegisteredUser | null>(null);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [feedback, setFeedback] = useState<{ overallFeedback: string; actionableSteps: string[]; } | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
        firstName: '',
        middleName: '',
        lastName: '',
        aboutMe: '',
        phone: '',
        poBox: '',
        country: '',
        github: '',
        gitlab: '',
        bitbucket: '',
        public: false,
        projects: [],
        workExperience: [],
        education: [],
    }
  });
  
  const { fields: projectFields, append: appendProject, remove: removeProject } = useFieldArray({
      control: form.control,
      name: "projects",
  });
  const { fields: workFields, append: appendWork, remove: removeWork } = useFieldArray({
      control: form.control,
      name: "workExperience",
  });
  const { fields: educationFields, append: appendEducation, remove: removeEducation } = useFieldArray({
      control: form.control,
      name: "education",
  });


  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (user) {
      getUserById(user.uid).then(profile => {
        if(profile) {
          setDbUser(profile);
          const { firstName, middleName, lastName } = splitDisplayName(profile.displayName);
          form.reset({
            firstName,
            middleName,
            lastName,
            aboutMe: profile.portfolio?.aboutMe || '',
            phone: profile.portfolio?.phone || '',
            poBox: profile.portfolio?.address?.poBox || '',
            country: profile.portfolio?.address?.country || '',
            github: profile.portfolio?.socialLinks?.github || '',
            gitlab: profile.portfolio?.socialLinks?.gitlab || '',
            bitbucket: profile.portfolio?.socialLinks?.bitbucket || '',
            public: profile.portfolio?.public || false,
            projects: profile.portfolio?.projects || [],
            workExperience: profile.portfolio?.workExperience || [],
            education: profile.portfolio?.education || [],
          });
        }
      });
    }
  }, [user, loading, router, form]);

  useEffect(() => {
    const getCameraPermission = async () => {
      if (!isCameraDialogOpen) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({video: true});
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use this feature.',
        });
      }
    };
    
    getCameraPermission();

    return () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
    }
  }, [isCameraDialogOpen, toast]);
  

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1 && names[1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`;
    }
    return names[0]?.[0] || 'U';
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  }

  const handleProfilePictureChange = async (file: File) => {
    if (!user) return;
    setIsUploading(true);
    try {
        const downloadURL = await uploadImage(user.uid, file);
        await updateProfile(user, { photoURL: downloadURL });
        await saveUser(user.uid, { photoURL: downloadURL });
        await auth.currentUser?.reload();
        setUser(auth.currentUser);

        toast({ title: 'Success', description: 'Your profile picture has been updated.' });
    } catch(error) {
        console.error(error);
        toast({ title: 'Upload Failed', description: 'Could not update your profile picture.', variant: 'destructive'});
    } finally {
        setIsUploading(false);
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleProfilePictureChange(file);
    }
  }
  
  const handleCapture = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(async (blob) => {
        if (blob) {
            const file = new File([blob], 'capture.png', { type: 'image/png' });
            await handleProfilePictureChange(file);
            setIsCameraDialogOpen(false);
        }
    }, 'image/png');
  }

  const onSubmit = async (values: ProfileFormValues) => {
    if (!user) return;
    setIsLoading(true);
    try {
        const newDisplayName = [values.firstName, values.middleName, values.lastName].filter(Boolean).join(' ');
        
        if (newDisplayName !== user.displayName) {
          await updateProfile(user, { displayName: newDisplayName });
        }

        const userSlug = slugify(newDisplayName);

        await saveUser(user.uid, {
            displayName: newDisplayName,
            slug: userSlug,
            photoURL: user.photoURL,
            portfolio: {
                aboutMe: values.aboutMe,
                phone: values.phone,
                address: {
                    poBox: values.poBox,
                    country: values.country,
                },
                socialLinks: {
                    github: values.github,
                    gitlab: values.gitlab,
                    bitbucket: values.bitbucket,
                },
                public: values.public,
                projects: values.projects,
                workExperience: values.workExperience,
                education: values.education,
            }
        });
        
        await auth.currentUser?.reload();
        setUser(auth.currentUser);
        setDbUser(prev => prev ? ({ ...prev, slug: userSlug }) : null);
        
        toast({ title: 'Success', description: 'Your profile has been updated.' });
    } catch(error) {
        console.error(error);
        toast({ title: 'Error', description: 'Failed to update profile.', variant: 'destructive'});
    } finally {
        setIsLoading(false);
    }
  }

   const handleGetFeedback = async () => {
    if (!dbUser) return;
    setIsGeneratingFeedback(true);
    setFeedback(null);
    try {
        const result = await getPortfolioFeedback({ userProfile: dbUser });
        setFeedback(result);
    } catch(error) {
        console.error(error);
        toast({ title: "Feedback Error", description: "The AI advisor could not generate feedback at this time.", variant: "destructive"});
    } finally {
        setIsGeneratingFeedback(false);
    }
  }


  if (loading || !user || !dbUser) {
     return (
        <div className="flex justify-center items-center min-h-screen">
            <LoadingAnimation />
        </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <div className="flex flex-col min-h-screen">
          <main className="flex-grow container mx-auto px-4 md:px-6 py-12">
            <div className="max-w-4xl mx-auto">
              <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <Card>
                        <CardHeader className="items-center text-center">
                            <div className="relative group">
                                <Avatar className="h-24 w-24 mb-4">
                                    <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || 'User'}/>
                                    <AvatarFallback className="text-3xl">{getInitials(user?.displayName)}</AvatarFallback>
                                </Avatar>
                                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    {isUploading ? <Loader2 className="h-8 w-8 animate-spin text-white" /> : <Camera className="h-8 w-8 text-white" />}
                                </div>
                            </div>
                        <CardTitle className="text-2xl font-headline">My Profile</CardTitle>
                        <CardDescription>View and manage your account details and portfolio.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden"/>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload Image
                            </Button>
                            <Dialog open={isCameraDialogOpen} onOpenChange={setIsCameraDialogOpen}>
                                <DialogTrigger asChild>
                                        <Button type="button" variant="outline" disabled={isUploading}>
                                            <Camera className="mr-2 h-4 w-4" />
                                            Take Photo
                                        </Button>
                                </DialogTrigger>
                                <DialogContent>
                                <DialogHeader>
                                        <DialogTitle>Take a Profile Photo</DialogTitle>
                                        <DialogDescription>
                                            Center your face in the frame and click capture.
                                        </DialogDescription>
                                </DialogHeader>
                                    <div className="flex justify-center items-center my-4">
                                    <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted />
                                    </div>
                                    {hasCameraPermission === false && (
                                        <Alert variant="destructive">
                                            <AlertTitle>Camera Access Required</AlertTitle>
                                            <AlertDescriptionComponent>
                                                Please allow camera access in your browser to use this feature.
                                            </AlertDescriptionComponent>
                                        </Alert>
                                    )}
                                    <DialogFooter>
                                        <DialogClose asChild>
                                            <Button variant="outline">Cancel</Button>
                                        </DialogClose>
                                        <Button onClick={handleCapture} disabled={!hasCameraPermission}>Capture</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                            </div>

                            <Separator />
                            
                            {/* ACCOUNT DETAILS */}
                            <h3 className="text-xl font-semibold">Account Details</h3>
                             <div className='space-y-2'>
                                <Label htmlFor='email'>Email Address</Label>
                                <Input id='email' value={user.email || ''} readOnly disabled />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField control={form.control} name="firstName" render={({ field }) => ( <FormItem> <FormLabel>First Name</FormLabel> <FormControl><Input placeholder="Jomo" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                                <FormField control={form.control} name="lastName" render={({ field }) => ( <FormItem> <FormLabel>Last Name</FormLabel> <FormControl><Input placeholder="Kenyatta" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                            </div>
                            <FormField control={form.control} name="middleName" render={({ field }) => ( <FormItem> <FormLabel>Middle Name (Optional)</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                            <p className="text-xs text-muted-foreground pt-2">Please ensure this is your full, correct name as it will be used on your certificates.</p>

                            <Separator />
                            
                            {/* PORTFOLIO DETAILS */}
                            <h3 className="text-xl font-semibold pt-4">Portfolio Details</h3>
                            <FormField control={form.control} name="aboutMe" render={({ field }) => ( <FormItem> <FormLabel>About Me / Professional Summary</FormLabel> <FormControl><Textarea placeholder="A brief summary about your skills and career goals." {...field} /></FormControl> <FormMessage /> </FormItem> )}/>

                             <h4 className="font-semibold pt-4">Contact Information</h4>
                             <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem> <FormLabel>Phone Number</FormLabel> <FormControl><Input placeholder="e.g., +254 712 345678" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField control={form.control} name="poBox" render={({ field }) => ( <FormItem> <FormLabel>P.O. Box</FormLabel> <FormControl><Input placeholder="e.g., 12345-00100" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                                <FormField control={form.control} name="country" render={({ field }) => ( <FormItem> <FormLabel>Country</FormLabel> <FormControl><Input placeholder="e.g., Kenya" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                            </div>
                            
                            {/* Work Experience Section */}
                            <Separator />
                            <div>
                                <h4 className="font-semibold mb-2 pt-4">Work Experience</h4>
                                <div className="space-y-4">
                                    {workFields.map((field, index) => (
                                        <Card key={field.id} className="p-4 bg-secondary/50">
                                            <div className="flex justify-end mb-2"> <Button type="button" variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => removeWork(index)}><Trash2 className="h-4 w-4"/></Button> </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <FormField control={form.control} name={`workExperience.${index}.jobTitle`} render={({field}) => (<FormItem><FormLabel>Job Title</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>)} />
                                                <FormField control={form.control} name={`workExperience.${index}.companyName`} render={({field}) => (<FormItem><FormLabel>Company</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>)} />
                                                <FormField control={form.control} name={`workExperience.${index}.startDate`} render={({field}) => (<FormItem><FormLabel>Start Date</FormLabel><FormControl><Input placeholder="e.g., Jan 2022" {...field}/></FormControl><FormMessage/></FormItem>)} />
                                                <FormField control={form.control} name={`workExperience.${index}.endDate`} render={({field}) => (<FormItem><FormLabel>End Date</FormLabel><FormControl><Input placeholder="Present" {...field}/></FormControl><FormMessage/></FormItem>)} />
                                            </div>
                                            <FormField control={form.control} name={`workExperience.${index}.description`} render={({field}) => (<FormItem className="mt-4"><FormLabel>Description</FormLabel><FormControl><Textarea {...field}/></FormControl><FormMessage/></FormItem>)} />
                                        </Card>
                                    ))}
                                </div>
                                <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => appendWork({ id: uuidv4(), jobTitle: '', companyName: '', startDate: '', endDate: 'Present', description: '' })}><PlusCircle className="mr-2 h-4 w-4" /> Add Experience</Button>
                            </div>

                            {/* Education Section */}
                            <Separator />
                            <div>
                                <h4 className="font-semibold mb-2 pt-4">Education</h4>
                                <div className="space-y-4">
                                    {educationFields.map((field, index) => (
                                        <Card key={field.id} className="p-4 bg-secondary/50">
                                            <div className="flex justify-end mb-2"> <Button type="button" variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => removeEducation(index)}><Trash2 className="h-4 w-4"/></Button> </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <FormField control={form.control} name={`education.${index}.institution`} render={({field}) => (<FormItem><FormLabel>Institution</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>)} />
                                                <FormField control={form.control} name={`education.${index}.degree`} render={({field}) => (<FormItem><FormLabel>Degree/Certificate</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>)} />
                                                <FormField control={form.control} name={`education.${index}.fieldOfStudy`} render={({field}) => (<FormItem><FormLabel>Field of Study</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>)} />
                                                <FormField control={form.control} name={`education.${index}.graduationYear`} render={({field}) => (<FormItem><FormLabel>Graduation Year</FormLabel><FormControl><Input placeholder="e.g., 2024" {...field}/></FormControl><FormMessage/></FormItem>)} />
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                                <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => appendEducation({ id: uuidv4(), institution: '', degree: '', fieldOfStudy: '', graduationYear: '' })}><PlusCircle className="mr-2 h-4 w-4" /> Add Education</Button>
                            </div>
                            
                            <Separator/>

                             <div>
                                <h3 className="text-lg font-semibold mb-2 pt-4">Featured Projects</h3>
                                <div className="space-y-4">
                                    {projectFields.map((field, index) => (
                                        <Card key={field.id} className="p-4 relative bg-secondary/50">
                                            <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1" onClick={() => removeProject(index)}> <Trash2 className="h-4 w-4 text-destructive" /> </Button>
                                            <div className="grid grid-cols-1 gap-4">
                                                <FormField control={form.control} name={`projects.${index}.title`} render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField control={form.control} name={`projects.${index}.description`} render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField control={form.control} name={`projects.${index}.imageUrl`} render={({ field }) => (<FormItem><FormLabel>Image URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField control={form.control} name={`projects.${index}.liveUrl`} render={({ field }) => (<FormItem><FormLabel>Live URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField control={form.control} name={`projects.${index}.sourceUrl`} render={({ field }) => (<FormItem><FormLabel>Source URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField
                                                    control={form.control}
                                                    name={`projects.${index}.technologies`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Technologies</FormLabel>
                                                            <FormControl>
                                                                <Input {...field} onChange={(e) => field.onChange(e.target.value.split(',').map(s => s.trim()))} value={Array.isArray(field.value) ? field.value.join(', ') : ''} />
                                                            </FormControl>
                                                            <FormDescription>
                                                                Enter technologies separated by a comma (e.g., React, Next.js, Firebase).
                                                            </FormDescription>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                                <Button type="button" variant="outline" className="mt-4" onClick={() => appendProject({ id: uuidv4(), title: '', description: '', imageUrl: 'https://picsum.photos/seed/project/400/250', liveUrl: '', sourceUrl: '', technologies: [] })}> <PlusCircle className="mr-2 h-4 w-4" /> Add Project </Button>
                            </div>

                            <Separator/>

                            <h3 className="text-xl font-semibold pt-4">Social & Repository Links</h3>
                             <div className="grid grid-cols-1 gap-4">
                              <FormField control={form.control} name="github" render={({ field }) => ( <FormItem> <FormLabel><div className="flex items-center gap-2"><Icon icon="mdi:github" className="h-5 w-5" /> GitHub URL</div></FormLabel> <FormControl><Input placeholder="https://github.com/username" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                              <FormField control={form.control} name="gitlab" render={({ field }) => ( <FormItem> <FormLabel><div className="flex items-center gap-2"><Icon icon="mdi:gitlab" className="h-5 w-5" /> GitLab URL</div></FormLabel> <FormControl><Input placeholder="https://gitlab.com/username" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                              <FormField control={form.control} name="bitbucket" render={({ field }) => ( <FormItem> <FormLabel><div className="flex items-center gap-2"><Icon icon="mdi:bitbucket" className="h-5 w-5" /> Bitbucket URL</div></FormLabel> <FormControl><Input placeholder="https://bitbucket.org/username" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                            </div>

                            <Separator />
                            <h3 className="text-xl font-semibold pt-4">Settings</h3>
                            <FormField control={form.control} name="public" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"> <div className="space-y-0.5"> <FormLabel className="text-base">Make Portfolio Public</FormLabel> <FormDescription> Allow employers and peers to view your completed courses and profile. </FormDescription> </div> <FormControl> <Switch checked={field.value} onCheckedChange={field.onChange} /> </FormControl> </FormItem> )}/>

                            <Separator />
                            <h3 className="text-xl font-semibold pt-4">AI Portfolio Advisor</h3>
                             <Card className="bg-secondary/50">
                                <CardHeader>
                                    <CardTitle>Get Feedback</CardTitle>
                                    <CardDescription>Get personalized feedback on how to improve your portfolio to attract employers.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button type="button" onClick={handleGetFeedback} disabled={isGeneratingFeedback}>
                                        {isGeneratingFeedback ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wand2 className="mr-2 h-4 w-4"/>}
                                        Analyze My Profile
                                    </Button>
                                </CardContent>
                            </Card>
                            {isGeneratingFeedback && (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                    <p className="ml-2 text-muted-foreground">The AI is analyzing your profile...</p>
                                </div>
                            )}
                            {feedback && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Feedback from your AI Advisor</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <p>{feedback.overallFeedback}</p>
                                        <div>
                                            <h4 className="font-semibold mb-2">Your Actionable Roadmap:</h4>
                                            <ul className="list-disc pl-5 space-y-2">
                                                {feedback.actionableSteps.map((step, index) => <li key={index}>{step}</li>)}
                                            </ul>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </CardContent>
                         <CardFooter className="flex flex-col sm:flex-row justify-between px-6 pt-6">
                            <Button variant="outline" onClick={handleLogout}>Logout</Button>
                            <div className="flex gap-2 mt-4 sm:mt-0">
                                {dbUser?.slug &&
                                  <Button asChild variant="secondary">
                                      <Link href={`/portfolio/${dbUser.slug}`}>
                                          <Eye className="mr-2 h-4 w-4" />
                                          View Public Portfolio
                                      </Link>
                                  </Button>
                                }
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Save Changes
                                </Button>
                            </div>
                        </CardFooter>
                    </Card>
                </form>
              </Form>
            </div>
          </main>
          <Footer />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
