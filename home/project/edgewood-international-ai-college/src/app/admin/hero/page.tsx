

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Loader2, Shield, Rss, Palette, Building, UserCheck, Image as ImageIconLucide, Megaphone, Activity, Trash2, Bot, Info } from 'lucide-react';
import { getHeroData, saveHeroData, getRemoteConfigValues, saveRemoteConfigValues, clearActivityData } from '@/lib/firebase-service';
import type { HeroData } from '@/lib/firebase-service';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchAndActivate, getString } from 'firebase/remote-config';
import { remoteConfig } from '@/lib/firebase';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDialogDescriptionComponent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


const heroFormSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters.'),
  subtitle: z.string().min(20, 'Subtitle must be at least 20 characters.'),
  imageUrl: z.string().url('Please enter a valid URL.'),
  programsImageUrl: z.string().url('Please enter a valid URL.').optional().default(''),
  bootcampsImageUrl: z.string().url('Please enter a valid URL.').optional().default(''),
  hackathonsImageUrl: z.string().url('Please enter a valid URL.').optional().default(''),
  portfoliosImageUrl: z.string().url('Please enter a valid URL.').optional().default(''),
  loginImageUrl: z.string().url('Please enter a valid URL for the login page image.'),
  signupImageUrl: z.string().url('Please enter a valid URL for the signup page image.'),
  slideshowSpeed: z.coerce.number().min(1, 'Speed must be at least 1 second.'),
  imageBrightness: z.coerce.number().min(0).max(100),
  recaptchaEnabled: z.boolean(),
  onboardingEnabled: z.boolean(),
  adsEnabled: z.boolean(),
  adInterval: z.coerce.number().min(5, 'Interval must be at least 5 seconds.'),
  theme: z.string().optional(),
  animationsEnabled: z.boolean(),
  orgHeroTitle: z.string().min(5, 'Title must be at least 5 characters.'),
  orgHeroSubtitle: z.string().min(20, 'Subtitle must be at least 20 characters.'),
  orgHeroImageUrl: z.string().url('Please enter a valid URL.'),
  orgLoginImageUrl: z.string().url('Please enter a valid URL.'),
  orgSignupImageUrl: z.string().url('Please enter a valid URL.'),
  activityTrackingEnabled: z.boolean().default(false),
  aiProvider: z.enum(['gemini', 'openai', 'anthropic']).default('gemini'),
  customModelId: z.string().optional(),
});

export default function AdminHeroPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const form = useForm<z.infer<typeof heroFormSchema>>({
    resolver: zodResolver(heroFormSchema),
    defaultValues: {
      title: '',
      subtitle: '',
      imageUrl: '',
      programsImageUrl: '',
      bootcampsImageUrl: '',
      hackathonsImageUrl: '',
      portfoliosImageUrl: '',
      loginImageUrl: '',
      signupImageUrl: '',
      slideshowSpeed: 5,
      imageBrightness: 60,
      recaptchaEnabled: true,
      onboardingEnabled: true,
      adsEnabled: false,
      adInterval: 30,
      theme: 'default',
      animationsEnabled: true,
      orgHeroTitle: '',
      orgHeroSubtitle: '',
      orgHeroImageUrl: '',
      orgLoginImageUrl: '',
      orgSignupImageUrl: '',
      activityTrackingEnabled: false,
      aiProvider: 'gemini',
      customModelId: '',
    },
  });

  useEffect(() => {
    const fetchHeroData = async () => {
      setIsFetching(true);
      try {
        const dbData = await getHeroData();
        
        let remoteTitle = dbData.title;
        let remoteSubtitle = dbData.subtitle;

        if (remoteConfig) {
           try {
              await fetchAndActivate(remoteConfig);
              remoteTitle = getString(remoteConfig, 'hero_title') || dbData.title;
              remoteSubtitle = getString(remoteConfig, 'hero_subtitle') || dbData.subtitle;
           } catch(e) {
             console.warn("Could not fetch remote config. Using defaults.");
           }
        }
        
        form.reset({
          ...dbData,
          title: remoteTitle,
          subtitle: remoteSubtitle,
          theme: dbData.theme || 'default',
          animationsEnabled: dbData.animationsEnabled !== false, // default to true if not set
          adsEnabled: dbData.adsEnabled || false,
          adInterval: dbData.adInterval || 30,
          onboardingEnabled: dbData.onboardingEnabled !== false,
          activityTrackingEnabled: dbData.activityTrackingEnabled || false,
          aiProvider: dbData.aiProvider || 'gemini',
          customModelId: dbData.customModelId || '',
        });

      } catch (error) {
        console.error("Failed to site data:", error);
        toast({
          title: 'Error',
          description: 'Failed to load site data. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsFetching(false);
      }
    };
    fetchHeroData();
  }, [form, toast]);

  const applyTheme = (theme: string) => {
    // Remove all theme classes
    document.documentElement.classList.remove('theme-valentines', 'theme-christmas', 'theme-new-year', 'theme-eid', 'theme-jamhuri', 'theme-diwali');
    if (theme !== 'default') {
      document.documentElement.classList.add(`theme-${theme}`);
    }
  }
  
  const handleClearActivity = async () => {
    setIsLoading(true);
    try {
        await clearActivityData();
        toast({ title: "Success!", description: "All user activity data has been cleared." });
    } catch(e) {
        toast({ title: "Error", description: "Could not clear activity data.", variant: "destructive"});
    } finally {
        setIsLoading(false);
    }
  }

  const onSubmit = async (values: z.infer<typeof heroFormSchema>) => {
    setIsLoading(true);
    try {
      // Save Remote Config values
      await saveRemoteConfigValues({
        hero_title: values.title,
        hero_subtitle: values.subtitle,
      });

      // Save other settings to the database
      const { title, subtitle, ...dbValues } = values;
      await saveHeroData(dbValues);

      // Apply theme on client-side
      if (values.theme) {
        localStorage.setItem('mkenya-skilled-theme', values.theme);
        applyTheme(values.theme);
      }
       localStorage.setItem('mkenya-skilled-animations', String(values.animationsEnabled));
       localStorage.setItem('mkenya-skilled-activity-tracking', String(values.activityTrackingEnabled));
       localStorage.setItem('mkenya-skilled-onboarding', String(values.onboardingEnabled));

      
      toast({
        title: 'Success!',
        description: 'Site settings have been updated.',
      });
    } catch (error) {
      console.error("Failed to save hero data:", error);
      toast({
        title: 'Error',
        description: 'Failed to save site settings. Please try again.',
        variant: 'destructive',
      });
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
            <Card>
                <CardHeader>
                    <CardTitle>Manage Site Settings</CardTitle>
                    <CardDescription>Update the content, appearance, and images for key areas of the website.</CardDescription>
                </CardHeader>
                <CardContent>
                  {isFetching ? (
                    <div className="flex justify-center items-center py-10">
                      <LoadingAnimation />
                    </div>
                  ) : (
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        
                        <div>
                            <h3 className="text-lg font-semibold flex items-center gap-2"><Bot /> AI Provider</h3>
                            <Separator className="mt-2" />
                        </div>
                         <FormField
                            control={form.control}
                            name="aiProvider"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Active AI Provider</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select an AI provider..." />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="gemini">Google Gemini</SelectItem>
                                        <SelectItem value="openai">OpenAI</SelectItem>
                                        <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormDescription>
                                    Select the primary AI service to power all generative features.
                                </FormDescription>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="customModelId"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Custom Model ID (Optional)</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter your fine-tuned model ID" {...field} />
                                </FormControl>
                                <FormDescription>
                                    If you have a fine-tuned model, enter its ID here to use it across the platform.
                                </FormDescription>
                                <FormMessage />
                                </FormItem>
                            )}
                        />


                        <div>
                            <h3 className="text-lg font-semibold flex items-center gap-2"><Palette /> Appearance</h3>
                            <Separator className="mt-2" />
                        </div>
                        
                        <FormField
                            control={form.control}
                            name="theme"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Active Theme</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a theme..." />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="default">Default</SelectItem>
                                        <SelectItem value="jamhuri">Jamhuri (Kenyan Holiday)</SelectItem>
                                        <SelectItem value="diwali">Diwali</SelectItem>
                                        <SelectItem value="valentines">Valentine's Day</SelectItem>
                                        <SelectItem value="christmas">Christmas</SelectItem>
                                        <SelectItem value="new-year">New Year</SelectItem>
                                        <SelectItem value="eid">Eid</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                          control={form.control}
                          name="animationsEnabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                              <div className="space-y-0.5">
                                <FormLabel>Enable Theme Animations</FormLabel>
                                <FormMessage />
                                 <p className="text-sm text-muted-foreground">
                                    Show animated effects like snow or fireworks for active themes.
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

                        <div>
                            <h3 className="text-lg font-semibold flex items-center gap-2"><Rss /> Homepage Content (Remotely Configured)</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                These values can be updated instantly for all users without needing to redeploy the app.
                            </p>
                            <Separator className="mt-2" />
                        </div>
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Unlock Your Potential." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="subtitle"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Subtitle</FormLabel>
                              <FormControl>
                                <Textarea placeholder="e.g., Quality, affordable courses..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div>
                            <h3 className="text-lg font-semibold flex items-center gap-2"><ImageIconLucide /> Page Banners</h3>
                             <Separator className="mt-2" />
                        </div>
                        <FormField
                          control={form.control}
                          name="imageUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Courses Page Hero Image</FormLabel>
                              <FormControl>
                                <Input placeholder="https://example.com/image.png" {...field} />
                              </FormControl>
                               <p className="text-sm text-muted-foreground">Main hero image on the home/courses page. Recommended size: 1200x400.</p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField control={form.control} name="programsImageUrl" render={({ field }) => (
                            <FormItem><FormLabel>Programs Page Hero Image</FormLabel><FormControl><Input placeholder="https://example.com/programs.png" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="bootcampsImageUrl" render={({ field }) => (
                            <FormItem><FormLabel>Bootcamps Page Hero Image</FormLabel><FormControl><Input placeholder="https://example.com/bootcamps.png" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="hackathonsImageUrl" render={({ field }) => (
                            <FormItem><FormLabel>Hackathons Page Hero Image</FormLabel><FormControl><Input placeholder="https://example.com/hackathons.png" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                         <FormField control={form.control} name="portfoliosImageUrl" render={({ field }) => (
                            <FormItem><FormLabel>Portfolios Page Hero Image</FormLabel><FormControl><Input placeholder="https://example.com/portfolios.png" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <FormField
                              control={form.control}
                              name="slideshowSpeed"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Slideshow Speed (seconds)</FormLabel>
                                  <FormControl>
                                    <Input type="number" placeholder="e.g., 5" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Controller
                                control={form.control}
                                name="imageBrightness"
                                render={({ field: { value, onChange } }) => (
                                    <FormItem>
                                        <FormLabel>Image Brightness: {value}%</FormLabel>
                                        <FormControl>
                                            <Slider
                                                defaultValue={[value]}
                                                max={100}
                                                step={5}
                                                onValueChange={(vals) => onChange(vals[0])}
                                            />
                                        </FormControl>
                                        <p className="text-xs text-muted-foreground">Controls the darkness of the overlay. 100% is brightest.</p>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                         </div>

                        <div>
                            <h3 className="text-lg font-semibold flex items-center gap-2"><UserCheck /> Onboarding & Auth</h3>
                            <Separator className="mt-2" />
                        </div>
                        <FormField
                          control={form.control}
                          name="onboardingEnabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                              <div className="space-y-0.5">
                                <FormLabel>Enable New User Tutorial</FormLabel>
                                 <p className="text-sm text-muted-foreground">
                                    Show a welcome tutorial to new users upon their first login.
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
                         <FormField
                          control={form.control}
                          name="loginImageUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Login Page Image URL</FormLabel>
                              <FormControl>
                                <Input placeholder="https://example.com/login-image.png" {...field} />
                              </FormControl>
                               <p className="text-sm text-muted-foreground">Background for the main login page. Recommended size: 1200x900.</p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                         <FormField
                          control={form.control}
                          name="signupImageUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Signup Page Image URL</FormLabel>
                              <FormControl>
                                <Input placeholder="https://example.com/signup-image.png" {...field} />
                              </FormControl>
                               <p className="text-sm text-muted-foreground">Background for the main signup page. Recommended size: 1200x900.</p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div>
                            <h3 className="text-lg font-semibold flex items-center gap-2"><Building /> Organization Pages</h3>
                            <Separator className="mt-2" />
                        </div>
                         <FormField
                          control={form.control}
                          name="orgHeroTitle"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Organization "For Business" Page Title</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Manda Network for Business" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="orgHeroSubtitle"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Organization Page Subtitle</FormLabel>
                              <FormControl>
                                <Textarea placeholder="e.g., Empower your workforce..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="orgHeroImageUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Organization Page Image URL</FormLabel>
                              <FormControl>
                                <Input placeholder="https://example.com/org-image.png" {...field} />
                              </FormControl>
                               <p className="text-sm text-muted-foreground">Background for the "/for-business" page. Recommended size: 1200x800.</p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                         <FormField
                          control={form.control}
                          name="orgLoginImageUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Organization Login Image URL</FormLabel>
                              <FormControl>
                                <Input placeholder="https://example.com/org-login.png" {...field} />
                              </FormControl>
                               <p className="text-sm text-muted-foreground">Background for the organization login page. Recommended size: 1200x900.</p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                         <FormField
                          control={form.control}
                          name="orgSignupImageUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Organization Signup Image URL</FormLabel>
                              <FormControl>
                                <Input placeholder="https://example.com/org-signup.png" {...field} />
                              </FormControl>
                               <p className="text-sm text-muted-foreground">Background for the organization signup page. Recommended size: 1200x900.</p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div>
                            <h3 className="text-lg font-semibold flex items-center gap-2"><Megaphone /> Advertisements</h3>
                            <Separator className="mt-2" />
                        </div>
                        <FormField
                          control={form.control}
                          name="adsEnabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                              <div className="space-y-0.5">
                                <FormLabel>Enable Popup Advertisements</FormLabel>
                                <p className="text-sm text-muted-foreground">
                                    Show promotional popups on the main course page.
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
                         <FormField
                              control={form.control}
                              name="adInterval"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Ad Popup Interval (seconds)</FormLabel>
                                  <FormControl>
                                    <Input type="number" placeholder="e.g., 30" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                         />

                        <div>
                            <h3 className="text-lg font-semibold flex items-center gap-2"><Activity /> Activity Tracking</h3>
                            <Separator className="mt-2" />
                        </div>
                        <FormField
                          control={form.control}
                          name="activityTrackingEnabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                              <div className="space-y-0.5">
                                <FormLabel>Enable Page Visit Tracking</FormLabel>
                                <p className="text-sm text-muted-foreground">
                                    Logs user page visits to the database for analytics. This may have performance and cost implications.
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
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button type="button" variant="destructive" className="w-full">
                                    <Trash2 className="mr-2 h-4 w-4"/>
                                    Clear All Activity Data
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescriptionComponent>
                                        This action cannot be undone. This will permanently delete all tracked user page visit data from the database.
                                    </AlertDialogDescriptionComponent>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleClearActivity}>Yes, delete it</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        <div>
                            <h3 className="text-lg font-semibold flex items-center gap-2"><Shield /> Security Settings</h3>
                            <Separator className="mt-2" />
                        </div>
                        <FormField
                          control={form.control}
                          name="recaptchaEnabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                              <div className="space-y-0.5">
                                <FormLabel>Enable reCAPTCHA</FormLabel>
                                <FormMessage />
                                 <p className="text-sm text-muted-foreground">
                                    Helps protect your site from spam and abuse on the signup page.
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

                        <div className="flex justify-end">
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

    
