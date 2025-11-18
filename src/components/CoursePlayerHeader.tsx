
'use client';

import { Progress } from "@/components/ui/progress";
import type { Course } from "@/lib/types";

interface CoursePlayerHeaderProps {
  progress: number;
}

export function CoursePlayerHeader({ progress }: CoursePlayerHeaderProps) {
  return (
    <div className="p-4 border-b bg-background flex-shrink-0">
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <Progress value={progress} className="h-2 flex-grow" />
                <span className="text-xs font-semibold text-primary w-12 text-right">
                    {Math.round(progress)}%
                </span>
            </div>
        </div>
    </div>
  );
}
