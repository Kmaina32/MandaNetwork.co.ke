
'use server';

/**
 * @fileOverview An AI agent for generating full course content.
 *
 * - generateCourseContent - A function that handles the course generation process.
 * - GenerateCourseContentInput - The input type for the generateCourseContent function.
 * - GenerateCourseContentOutput - The return type for the generateCourseContentOutput function.
 */

import { ai } from '@/ai/genkit-instance';
import {z} from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { listCoursesTool } from '../tools/course-catalog';

const GenerateCourseContentInputSchema = z.object({
  courseTitle: z.string().describe('The title of the course to be generated.'),
  courseContext: z.string().optional().describe('A rich text context containing course material, such as a Kaggle dataset URL, sample CSV data, or a YouTube transcript.'),
});
export type GenerateCourseContentInput = z.infer<typeof GenerateCourseContentInputSchema>;

const YoutubeLinkSchema = z.object({
    title: z.string().describe('The title of the YouTube video.'),
    url: z.string().url().describe('The URL of the YouTube video.'),
});

const GoogleDriveLinkSchema = z.object({
    title: z.string().describe('The title of the Google Drive resource.'),
    url: z.string().url().describe('The shareable URL of the Google Drive file.'),
});

const LessonSchema = z.object({
    id: z.string().describe("A unique identifier for the lesson, e.g., 'lesson-1'."),
    title: z.string().describe('The title of the lesson.'),
    duration: z.string().describe("The estimated duration of the lesson, e.g., '5 min' or '10 min'."),
    content: z.string().describe('The full, extensive, and detailed content of the lesson text. It should be comprehensive and provide in-depth information.'),
    youtubeLinks: z.array(YoutubeLinkSchema).describe('An array of relevant YouTube links for this lesson. Extract these from the course context if available.'),
    googleDriveLinks: z.array(GoogleDriveLinkSchema).describe('An array for Google Drive links. ALWAYS provide an EMPTY array as you cannot access Google Drive.'),
});

const ModuleSchema = z.object({
    id: z.string().describe("A unique identifier for the module, e.g., 'module-1'."),
    title: z.string().describe('The title of the module.'),
    lessons: z.array(LessonSchema).min(1).describe('An array of lessons for this module.'),
});

const ShortAnswerQuestionSchema = z.object({
    id: z.string().describe("A unique identifier for the question, e.g., 'q-1'."),
    type: z.string().describe("The type of the question, either 'short-answer' or 'multiple-choice'."),
    question: z.string().describe('The exam question.'),
    referenceAnswer: z.string().describe('The detailed, correct reference answer for the exam question.'),
    maxPoints: z.number().describe('The maximum points possible for the exam question, always set to 10.'),
});

const MultipleChoiceQuestionSchema = z.object({
    id: z.string().describe("A unique identifier for the question, e.g., 'q-2'."),
    type: z.string().describe("The type of the question, either 'short-answer' or 'multiple-choice'."),
    question: z.string().describe('The exam question.'),
    options: z.array(z.string()).length(4).describe('An array of 4 possible answers for the question.'),
    correctAnswer: z.coerce.number().min(0).max(3).describe('The index of the correct answer in the options array.'),
    maxPoints: z.number().describe('The maximum points possible for the exam question, always set to 10.'),
});

const ExamQuestionSchema = z.union([ShortAnswerQuestionSchema, MultipleChoiceQuestionSchema]);

const ProjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  imageUrl: z.string().url(),
  liveUrl: z.string().url().optional(),
  sourceUrl: z.string().url().optional(),
  technologies: z.array(z.string()),
});

const GenerateCourseContentOutputSchema = z.object({
  longDescription: z.string().min(100).describe('A detailed, comprehensive description of the entire course.'),
  duration: z.string().describe("The estimated total duration of the course, e.g., '4 Weeks' or '6 Weeks'."),
  modules: z.array(ModuleSchema).length(2).describe('An array of exactly 2 modules for the course. Each module should contain at least 2000 words of content distributed across its lessons.'),
  exam: z.array(ExamQuestionSchema).length(5).describe('The final exam for the course, containing exactly five questions, with a mix of short-answer and multiple-choice questions.'),
  project: ProjectSchema.optional().describe("An optional final project for the course."),
  discussionPrompt: z.string().optional().describe('A comprehensive discussion prompt to encourage student engagement.'),
});
export type GenerateCourseContentOutput = z.infer<typeof GenerateCourseContentOutputSchema>;

export async function generateCourseContent(
  input: GenerateCourseContentInput
): Promise<GenerateCourseContentOutput> {
  return generateCourseContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCourseContentPrompt',
  tools: [listCoursesTool],
  input: {schema: GenerateCourseContentInputSchema},
  output: {schema: GenerateCourseContentOutputSchema},
  prompt: `You are an expert curriculum developer for an online learning platform in Kenya called Manda Network. Your task is to generate a complete course structure based on a given title and context.

First, use the 'listCourses' tool to see if there are any existing courses in the catalog. If there are, you MUST NOT create a course that is a duplicate or very similar to an existing one. Your new course idea must be unique. If no courses are returned, proceed with generation.

The new course must be comprehensive and well-structured.
It MUST include:
- A detailed long description (minimum 100 characters).
- An estimated total duration (e.g., "4 Weeks").
- Exactly two (2) modules. Each module should contain at least 2000 words of content distributed across its lessons.
- A total of at least seven (7) lessons distributed between the modules.
- A final exam with exactly five (5) questions: three (3) 'multiple-choice' questions and two (2) 'short-answer' questions.

Course Title: {{{courseTitle}}}

{{#if courseContext}}
Use the following context as the primary source of information. If it contains a Kaggle URL, structure the course around analyzing that dataset. If it contains other text like a YouTube transcript or sample CSV data, use that as the basis for the curriculum. Extract key topics for modules and lessons, and most importantly, extract any YouTube URLs to include in the relevant lessons.
Course Context:
{{{courseContext}}}
{{/if}}

Please generate the following content for the NEW, UNIQUE course:
1.  **Long Description**: A detailed description of what the course is about, who it's for, and what students will learn. Minimum 100 characters.
2.  **Duration**: The estimated total duration of the course.
3.  **Modules**: A list of exactly 2 modules. Each module must have a unique ID, a title, and its list of lessons. The total content for all lessons within a single module MUST exceed 2000 words.
4.  **Lessons**: Distribute at least 7 lessons between the modules. Each lesson must have a unique ID, title, duration (e.g., "5 min"), and full, extensive lesson content.
    - For **content**, you MUST write full, extensive, and detailed content for the lesson text. It should be comprehensive and provide in-depth information, not just a brief summary.
    - For **youtubeLinks**, you MUST ONLY include a link if a valid, full 'https://' URL is found in the context. If no valid URL is present, you MUST provide an EMPTY array. Do not invent URLs.
    - For **googleDriveLinks**, ALWAYS provide an EMPTY array.
5.  **Exam**: A final exam with an array of exactly 5 questions. This exam must contain three (3) 'multiple-choice' questions and two (2) 'short-answer' questions. Each question needs a unique ID, type, text, max points (always 10), and the correct answer details (referenceAnswer for short-answer, options array and correctAnswer index for multiple-choice).
6.  **Project**: Leave the project field empty (null or undefined) when generating course content.
7.  **Discussion Prompt**: A comprehensive and thought-provoking discussion prompt related to the course content. This should encourage students to share their findings and engage with each other.

Generate the full course structure now.`,
});

const generateCourseContentFlow = ai.defineFlow(
  {
    name: 'generateCourseContentFlow',
    inputSchema: GenerateCourseContentInputSchema,
    outputSchema: GenerateCourseContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

    