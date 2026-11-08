
'use client';

import { Progress } from "@/components/ui/progress";
import { Clock } from 'lucide-react';

interface CoursePlayerHeaderProps {
  progress: number;
  timeLeft: number;
}

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function CoursePlayerHeader({ progress, timeLeft }: CoursePlayerHeaderProps) {
  return (
    <div className="shrink-0 border-b bg-background px-3 py-3 sm:p-4">
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 sm:gap-4">
                <Progress value={progress} className="h-2 flex-grow" />
                <div className="flex w-20 shrink-0 items-center justify-end gap-2 text-xs font-semibold text-primary text-right sm:w-24">
                    <Clock className="h-4 w-4" />
                    <span>{formatTime(timeLeft)}</span>
                </div>
            </div>
        </div>
    </div>
  );
}
