
'use client';

import { Progress } from "@/components/ui/progress";
import type { Course } from "@/lib/types";

interface CoursePlayerHeaderProps {
  course: Course;
  progress: number;
}

export function CoursePlayerHeader({ course, progress }: CoursePlayerHeaderProps) {
  return (
    <div className="p-4 border-b bg-background flex-shrink-0">
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <div className="flex-grow">
                    <p className="text-sm text-muted-foreground">Course Progress</p>
                    <h2 className="font-bold text-lg truncate" title={course.title}>
                        {course.title}
                    </h2>
                </div>
                <div className="flex items-center gap-2 w-32 flex-shrink-0">
                    <Progress value={progress} className="h-2 flex-grow" />
                    <span className="text-xs font-semibold text-primary w-10 text-right">
                        {Math.round(progress)}%
                    </span>
                </div>
            </div>
        </div>
    </div>
  );
}
