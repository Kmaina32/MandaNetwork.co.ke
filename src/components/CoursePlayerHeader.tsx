
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
    <div className="p-4 border-b bg-background flex-shrink-0">
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <Progress value={progress} className="h-2 flex-grow" />
                <div className="flex items-center gap-2 text-xs font-semibold text-primary w-24 text-right">
                    <Clock className="h-4 w-4" />
                    <span>{formatTime(timeLeft)}</span>
                </div>
            </div>
        </div>
    </div>
  );
}
