
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, BrainCircuit, Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAllCourses } from '@/lib/firebase-service';
import type { Course } from '@/lib/types';
import { saveAs } from 'file-saver';

// Function to convert your course data into a JSONL format suitable for fine-tuning
const convertToJSONL = (courses: Course[]): string => {
  return courses.map(course => {
    // We create a structured prompt-response pair for the AI to learn from.
    // The "prompt" is a request to create a course.
    // The "completion" is the high-quality, structured output it should produce.
    const prompt = `Generate a comprehensive course about "${course.title}".`;
    const completion = {
      title: course.title,
      longDescription: course.longDescription,
      duration: course.duration,
      modules: course.modules.map(module => ({
        title: module.title,
        lessons: module.lessons.map(lesson => ({
          title: lesson.title,
          duration: lesson.duration,
          content: lesson.content,
        })),
      })),
      exam: course.exam,
    };
    
    // The final format for each line in the JSONL file
    return JSON.stringify({ prompt, completion });
  }).join('\n');
};


export default function TrainingDataPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setIsLoading(true);
    toast({ title: 'Exporting Data...', description: 'Fetching and processing all course content.' });

    try {
      const courses = await getAllCourses();
      if (courses.length === 0) {
        toast({ title: 'No Courses Found', description: 'There is no course content to export.', variant: 'destructive' });
        return;
      }
      
      const jsonlData = convertToJSONL(courses);
      const blob = new Blob([jsonlData], { type: 'application/jsonl;charset=utf-8' });
      saveAs(blob, 'manda_network_finetuning_data.jsonl');
      
      toast({ title: 'Export Successful!', description: `Exported ${courses.length} courses to manda_network_finetuning_data.jsonl.`});

    } catch (error) {
      console.error('Failed to export training data:', error);
      toast({ title: 'Export Failed', description: 'Could not export course data.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" />
        Back to Admin Dashboard
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="h-6 w-6" />
            AI Model Training Data
          </CardTitle>
          <CardDescription>
            Export your platform's course content into a structured format (JSONL) suitable for fine-tuning a custom large language model.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-6 border rounded-lg bg-secondary/50">
             <h3 className="font-semibold text-lg">Export All Course Content</h3>
             <p className="text-muted-foreground mt-1 mb-4 text-sm">
                This process will compile all your courses, modules, lessons, and exams into a single JSONL file. You can then use this file with a service like Google's Vertex AI or OpenAI's API to fine-tune a base model.
             </p>
             <Button onClick={handleExport} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Export Training Data (.jsonl)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
