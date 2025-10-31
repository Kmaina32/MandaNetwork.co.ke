
'use server';

/**
 * @fileOverview An AI agent for generating a course exam.
 *
 * - generateExam - A function that handles the exam generation process.
 * - GenerateExamInput - The input type for the generateExam function.
 * - GenerateExamOutput - The return type for the generateExam function.
 */

import { ai } from '@/ai/genkit-instance';
import {z} from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const GenerateExamInputSchema = z.object({
  courseTitle: z.string().describe('The title of the course.'),
  courseDescription: z.string().describe('A description of the course content to base the exam on.'),
});
export type GenerateExamInput = z.infer<typeof GenerateExamInputSchema>;

const ShortAnswerQuestionSchema = z.object({
    id: z.string().describe("A unique identifier for the question, e.g., 'q-1'."),
    type: z.string().describe("The type of the question, must be the string 'short-answer'."),
    question: z.string().describe('The exam question.'),
    referenceAnswer: z.string().describe('The detailed, correct reference answer for the exam question.'),
    maxPoints: z.number().describe('The maximum points possible for the exam question, always set to 10.'),
});

const MultipleChoiceQuestionSchema = z.object({
    id: z.string().describe("A unique identifier for the question, e.g., 'q-2'."),
    type: z.string().describe("The type of the question, must be the string 'multiple-choice'."),
    question: z.string().describe('The exam question.'),
    options: z.array(z.string()).length(4).describe('An array of 4 possible answers for the question.'),
    correctAnswer: z.coerce.number().min(0).max(3).describe('The index of the correct answer in the options array.'),
    maxPoints: z.number().describe('The maximum points possible for the exam question, always set to 10.'),
});

const ExamQuestionSchema = z.union([ShortAnswerQuestionSchema, MultipleChoiceQuestionSchema]);

const GenerateExamOutputSchema = z.object({
  exam: z.array(ExamQuestionSchema).min(5).describe('The final exam for the course, containing at least five questions.'),
});
export type GenerateExamOutput = z.infer<typeof GenerateExamOutputSchema>;

export async function generateExam(
  input: GenerateExamInput
): Promise<GenerateExamOutput> {
  return generateExamFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateExamPrompt',
  input: {schema: GenerateExamInputSchema},
  output: {schema: GenerateExamOutputSchema},
  prompt: `You are an expert curriculum developer. Your task is to generate a final exam for an online course based on its title and description.

The exam must be rigorous and test the core concepts of the course.
The final exam must contain at least five questions.
The questions should be a mix of multiple-choice and short-answer types.

**CRITICAL INSTRUCTIONS FOR QUESTION FORMAT:**
- For **'multiple-choice'** questions, you MUST provide an \`options\` array with exactly 4 string values and a \`correctAnswer\` field with the index (0-3) of the correct option. DO NOT use \`referenceAnswer\` for multiple-choice questions.
- For **'short-answer'** questions, you MUST provide a \`referenceAnswer\` field with a detailed correct answer. DO NOT use \`options\` or \`correctAnswer\` for short-answer questions.
- Every question MUST have a \`type\` field set to either 'multiple-choice' or 'short-answer'.

Course Title: {{{courseTitle}}}
Course Description: {{{courseDescription}}}

Please generate the full exam now.`,
});

const generateExamFlow = ai.defineFlow(
  {
    name: 'generateExamFlow',
    inputSchema: GenerateExamInputSchema,
    outputSchema: GenerateExamOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
