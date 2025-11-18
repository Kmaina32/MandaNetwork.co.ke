
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  CheckCircle,
  Lock,
  PlayCircle,
  Star,
  ArrowLeft,
  Youtube,
} from 'lucide-react';
import type { Course, Lesson, Module } from '@/lib/types';
import { slugify } from '@/lib/utils';

function calculateModuleProgress(
  module: Module,
  completedLessons: Set<string>
): number {
  if (!module.lessons || module.lessons.length === 0) return 0;
  const completedInModule = module.lessons.filter((l) =>
    completedLessons.has(l.id)
  ).length;
  return (completedInModule / module.lessons.length) * 100;
}

interface CourseOutlineProps {
    course: Course;
    progress: number;
    completedLessons: Set<string>;
    unlockedLessonsCount: number;
    currentLesson: Lesson | null;
    onLessonClick: (lesson: Lesson, index: number) => void;
    onExamClick: () => void;
    isMobileSheet?: boolean;
}

export function CourseOutline({
  course,
  progress,
  completedLessons,
  unlockedLessonsCount,
  currentLesson,
  onLessonClick,
  onExamClick,
  isMobileSheet = false,
}: CourseOutlineProps) {
  const router = useRouter();

  return (
    <div className="p-4">
      {isMobileSheet ? (
        <SheetHeader className="mb-4 text-left">
          <SheetTitle>Course Outline</SheetTitle>
        </SheetHeader>
      ) : (
        <button
          onClick={() => router.push(`/courses/${slugify(course.title)}`)}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Course Details
        </button>
      )}
      <h2 className="text-xl font-bold mb-1 font-headline">{course.title}</h2>
      <p className="text-sm text-muted-foreground mb-2">{course.duration}</p>
      <div className="flex items-center gap-2 mb-4">
        <Progress value={progress} className="h-2 flex-grow" />
        <span className="text-xs text-muted-foreground">
          {Math.round(progress)}%
        </span>
      </div>
      <Accordion
        type="multiple"
        defaultValue={course.modules?.map((m) => m.id)}
        className="w-full"
      >
        {course.modules?.map((module, moduleIndex) => {
          const moduleProgress = calculateModuleProgress(module, completedLessons);
          return (
            <AccordionItem value={module.id} key={module.id}>
              <AccordionTrigger className="font-semibold px-4">
                <div className="w-full">
                  <p>{module.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress
                      value={moduleProgress}
                      className="h-1 flex-grow bg-secondary"
                    />
                    <span className="text-xs font-normal text-muted-foreground">
                      {Math.round(moduleProgress)}%
                    </span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-1 p-2">
                  {module.lessons.map((lesson, lessonIndex) => {
                    const overallLessonIndex =
                      course.modules
                        .slice(0, moduleIndex)
                        .reduce((acc, m) => acc + m.lessons.length, 0) +
                      lessonIndex;
                    const isUnlocked = overallLessonIndex < unlockedLessonsCount;
                    const isCompleted = completedLessons.has(lesson.id);
                    const hasVideo =
                      lesson.youtubeLinks && lesson.youtubeLinks.length > 0;

                    return (
                      <li key={lesson.id}>
                        <button
                          onClick={() => onLessonClick(lesson, overallLessonIndex)}
                          disabled={!isUnlocked && !isCompleted}
                          className={`w-full text-left flex items-center justify-between gap-3 p-2 rounded-md transition-colors ${
                            currentLesson?.id === lesson.id
                              ? 'bg-primary/10 text-primary'
                              : 'hover:bg-primary/5'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <div className="flex items-center gap-3">
                            {isCompleted ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : isUnlocked ? (
                              <PlayCircle className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <Lock className="h-5 w-5 text-muted-foreground" />
                            )}
                            <span className="text-sm">{lesson.title}</span>
                          </div>
                          {hasVideo && (
                            <Youtube className="h-4 w-4 text-red-500 flex-shrink-0" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </AccordionContent>
            </AccordionItem>
          );
        })}
        <AccordionItem value="exam">
          <AccordionTrigger className="font-semibold px-4">
            Final Exam
          </AccordionTrigger>
          <AccordionContent>
            <div className="p-2">
              <button
                onClick={onExamClick}
                disabled={progress < 100}
                className="w-full text-left flex items-center gap-3 p-2 rounded-md transition-colors hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {progress < 100 ? (
                  <Lock className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Star className="h-5 w-5 text-yellow-500" />
                )}
                <span className="text-sm">Take the Final Exam</span>
              </button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
