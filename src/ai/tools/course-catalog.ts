
'use server';
/**
 * @fileOverview A Genkit tool for fetching the course catalog.
 *
 * - listCoursesTool - A tool that fetches all available courses.
 */

import { ai } from '@/ai/genkit-instance';
import { getAllCourses } from '@/lib/firebase-service';
import { z } from 'zod';

const CourseSchema = z.object({
  id: z.string(),
  title: z.string(),
  longDescription: z.string(),
});

export const listCoursesTool = ai.defineTool(
  {
    name: 'listCourses',
    description: 'Get a list of all available courses in the Varban Academy catalog to help with student requests.',
    inputSchema: z.object({}),
    outputSchema: z.array(CourseSchema),
  },
  async () => {
    const courses = await getAllCourses();
    // Return a simplified version of the course data for the LLM
    return courses.map(course => ({
      id: course.id,
      title: course.title,
      longDescription: course.longDescription,
    }));
  }
);
