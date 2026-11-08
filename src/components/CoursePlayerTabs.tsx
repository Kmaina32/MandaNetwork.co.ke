
'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Video, MessageCircle } from 'lucide-react';
import { LessonContent } from '@/components/LessonContent';
import { DiscussionForum } from '@/components/DiscussionForum';
import type { Lesson, Course } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { slugify } from '@/lib/utils';

interface CoursePlayerTabsProps {
    lesson: Lesson | null;
    course: Course;
}

function getYouTubeEmbedUrl(url: string | undefined): string | null {
    if (!url) return null;
    let videoId: string | null = null;
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname === 'youtu.be') {
        videoId = urlObj.pathname.slice(1);
      } else if (urlObj.hostname.includes('youtube.com')) {
        videoId = urlObj.searchParams.get('v');
      }
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    } catch(e) {
      return null;
    }
}

export function CoursePlayerTabs({ lesson, course }: CoursePlayerTabsProps) {
    const [activeTab, setActiveTab] = useState('lesson');
    const router = useRouter();

    const hasVideo = !!lesson?.youtubeLinks?.[0]?.url;
    const videoUrl = getYouTubeEmbedUrl(lesson?.youtubeLinks?.[0]?.url);

    if (!lesson) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <CheckCircle className="h-24 w-24 text-green-500 mb-4" />
                <h1 className="text-3xl font-bold mb-2 font-headline">You've completed all lessons!</h1>
                <p className="text-muted-foreground mb-6">Great job. Now it's time to test your knowledge.</p>
                <Button size="lg" onClick={() => router.push(`/courses/${slugify(course.title)}/exam`)}>
                    Go to Final Exam
                </Button>
            </div>
        )
    }

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex w-full min-w-0 max-w-full flex-1 flex-col overflow-x-hidden">
            <TabsList className="mb-4 grid h-auto w-full max-w-full grid-cols-3 gap-1 p-1 sm:flex sm:w-fit sm:gap-0">
                <TabsTrigger value="lesson" className="min-w-0 px-2 text-xs sm:px-3 sm:text-sm">
                    <FileText className="mr-2 h-4 w-4" />
                    Lesson
                </TabsTrigger>
                <TabsTrigger value="video" disabled={!hasVideo} className="min-w-0 px-2 text-xs sm:px-3 sm:text-sm">
                    <Video className="mr-2 h-4 w-4" />
                    Video
                </TabsTrigger>
                <TabsTrigger value="discussion" className="min-w-0 px-2 text-xs sm:px-3 sm:text-sm">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Discussion
                </TabsTrigger>
            </TabsList>
            <TabsContent value="lesson" className="w-full min-w-0 max-w-full flex-1">
                <LessonContent lesson={lesson} />
            </TabsContent>
            <TabsContent value="video" className="min-h-0 w-full min-w-0 max-w-full flex-1">
                {videoUrl ? (
                    <iframe
                        src={videoUrl}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="block aspect-video h-auto max-h-[70dvh] w-full max-w-full rounded-lg"
                    ></iframe>
                ) : (
                    <div className="flex items-center justify-center h-full bg-black rounded-lg">
                        <p className="text-muted-foreground">No video for this lesson.</p>
                    </div>
                )}
            </TabsContent>
            <TabsContent value="discussion" className="w-full min-w-0 max-w-full flex-1">
                <DiscussionForum courseId={course.id} />
            </TabsContent>
        </Tabs>
    );
}
