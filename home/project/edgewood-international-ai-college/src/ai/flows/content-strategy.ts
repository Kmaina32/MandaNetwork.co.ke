
'use server';

/**
 * @fileOverview An AI agent for generating a daily content strategy.
 */

import { ai } from '@/ai/genkit-instance';
import { generateCourseContent } from './generate-course-content';
import { createCourse, createProgram, createBundle } from '@/lib/firebase-service';
import { z } from 'zod';
import { ContentStrategyOutputSchema } from '@/lib/types';

// Schema for generating course ideas
const CourseIdeasSchema = z.object({
  courseIdeas: z.array(z.object({
    title: z.string().describe('A compelling and marketable title for a new course.'),
    category: z.string().describe('A relevant category for the course (e.g., Technology, Business, Arts).'),
    instructor: z.string().describe('A plausible Kenyan-sounding instructor name.'),
    price: z.number().describe('A realistic price in Kenyan Shillings (e.g., 2500, 4999).'),
    description: z.string().describe('A short, marketable description for the course (1-2 sentences).'),
    duration: z.string().describe('An estimated duration, like "4 Weeks" or "6 Hours".'),
  })).length(10).describe('An array of exactly 10 unique and relevant course ideas for a Kenyan audience.'),
});

// Schema for suggesting a new program
const ProgramSuggestionSchema = z.object({
  programTitle: z.string().describe('A title for a new certificate program based on the generated courses.'),
  programDescription: z.string().describe('A brief description for the new program.'),
  courseIndices: z.array(z.number()).min(3).max(5).describe('An array of indices (from the list of 10 new courses, 0-9) to include in this program.'),
});

// Schema for suggesting a new bundle
const BundleSuggestionSchema = z.object({
    bundleTitle: z.string().describe('A title for a new course bundle for marketing purposes.'),
    bundleDescription: z.string().describe('A brief, marketable description for the bundle.'),
    bundlePrice: z.number().describe('A suggested price for the bundle in Kenyan Shillings (Ksh).'),
    courseIndices: z.array(z.number()).min(2).max(4).describe('An array of indices (from the list of 10 new courses, 0-9) to include in this bundle.'),
});


export async function runContentStrategy(): Promise<ContentStrategyOutput> {
  return runContentStrategyFlow();
}

const runContentStrategyFlow = ai.defineFlow(
  {
    name: 'runContentStrategyFlow',
    inputSchema: z.void(),
    outputSchema: ContentStrategyOutputSchema,
  },
  async () => {
    // Step 1: Generate 10 course ideas
    console.log('Generating course ideas...');
    const ideasResponse = await ai.generate({
      prompt: `You are a Content Strategist for Manda Network, an online learning platform for a Kenyan audience. Your task is to brainstorm 10 highly relevant and marketable course ideas that would appeal to students looking to upskill. Provide a title, category, instructor, price, short description, and duration for each.`,
      output: {
        schema: CourseIdeasSchema,
      },
    });

    const courseIdeas = ideasResponse.output?.courseIdeas;
    if (!courseIdeas || courseIdeas.length === 0) {
      throw new Error('Failed to generate course ideas.');
    }

    // Step 2: Create draft courses from the ideas
    console.log('Creating draft courses from 10 ideas...');
    const createdCourses = [];
    for (const idea of courseIdeas) {
      try {
        const courseData = {
          ...idea,
          longDescription: 'This course content is AI-generated and needs to be reviewed. You can use the AI generator on the course edit page to create the full curriculum.',
          dripFeed: 'daily' as const,
          imageUrl: 'https://placehold.co/600x400',
          modules: [],
          exam: []
        };
        const courseId = await createCourse(courseData);
        createdCourses.push({ id: courseId, ...courseData });
        console.log(`- Course "${idea.title}" created.`);
      } catch (e) {
          console.error(`Failed to create course "${idea.title}"`, e);
      }
    }
    
    if(createdCourses.length === 0) {
        throw new Error('No courses were successfully created.');
    }

    const createdCourseTitles = createdCourses.map(c => c.title);

    // Step 3: Suggest and create a program from the new courses
    console.log('Generating program suggestion...');
    const programResponse = await ai.generate({
        prompt: `Based on the following list of newly created courses, create a compelling Certificate Program that groups a logical subset of them together. The courses are: ${createdCourseTitles.join(', ')}`,
        output: {
            schema: ProgramSuggestionSchema,
        },
    });

    const programSuggestion = programResponse.output;
    if (!programSuggestion) throw new Error('Failed to generate program suggestion.');

    const programCourseIds = programSuggestion.courseIndices.map(i => createdCourses[i].id);
    await createProgram({
        title: programSuggestion.programTitle,
        description: programSuggestion.programDescription,
        courseIds: programCourseIds,
        certificateImageUrl: 'https://placehold.co/1123x794.png',
    });
     console.log(`- Program "${programSuggestion.programTitle}" created.`);

    // Step 4: Suggest and create a bundle from the new courses
    console.log('Generating bundle suggestion...');
    const bundleResponse = await ai.generate({
        prompt: `Based on the following list of newly created courses, create a compelling Course Bundle for marketing purposes that groups a logical subset of them together. The courses are: ${createdCourseTitles.join(', ')}`,
        output: {
            schema: BundleSuggestionSchema,
        },
    });
    
    const bundleSuggestion = bundleResponse.output;
    if (!bundleSuggestion) throw new Error('Failed to generate bundle suggestion.');

    const bundleCourseIds = bundleSuggestion.courseIndices.map(i => createdCourses[i].id);
    await createBundle({
        title: bundleSuggestion.bundleTitle,
        description: bundleSuggestion.bundleDescription,
        price: bundleSuggestion.bundlePrice,
        courseIds: bundleCourseIds,
        imageUrl: 'https://placehold.co/600x400',
    });
    console.log(`- Bundle "${bundleSuggestion.bundleTitle}" created.`);
    
    return {
        coursesCreated: createdCourses.length,
        programTitle: programSuggestion.programTitle,
        bundleTitle: bundleSuggestion.bundleTitle
    }
  }
);
