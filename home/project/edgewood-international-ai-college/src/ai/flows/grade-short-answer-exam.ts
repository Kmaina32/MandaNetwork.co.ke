'use server';

/**
 * @fileOverview An AI agent for grading short answer exam questions.
 *
 * - gradeShortAnswerExam - A function that handles the grading process.
 * - GradeShortAnswerExamInput - The input type for the gradeShortAnswerExam function.
 * - GradeShortAnswerExamOutput - The return type for the gradeShortAnswerExam function.
 */

import { ai } from '@/ai/genkit-instance';
import {z} from 'genkit';

const GradeShortAnswerExamInputSchema = z.object({
  question: z.string().describe('The exam question.'),
  answer: z.string().describe('The student’s answer to the question.'),
  referenceAnswer: z
    .string()
    .describe(
      'The reference answer to the question, to be used as the ground truth for grading.'
    ),
  maxPoints: z.number().describe('The maximum points possible for the question.'),
});
export type GradeShortAnswerExamInput = z.infer<typeof GradeShortAnswerExamInputSchema>;

const GradeShortAnswerExamOutputSchema = z.object({
  pointsAwarded: z
    .number()
    .describe('The number of points awarded to the student for their answer.'),
  feedback: z.string().describe('Detailed feedback on the student’s answer.'),
});
export type GradeShortAnswerExamOutput = z.infer<typeof GradeShortAnswerExamOutputSchema>;

export async function gradeShortAnswerExam(
  input: GradeShortAnswerExamInput
): Promise<GradeShortAnswerExamOutput> {
  return gradeShortAnswerExamFlow(input);
}

const prompt = ai.definePrompt({
  name: 'gradeShortAnswerExamPrompt',
  input: {schema: GradeShortAnswerExamInputSchema},
  output: {schema: GradeShortAnswerExamOutputSchema},
  prompt: `You are an AI exam grader. Grade the following answer to the question below. Provide detailed feedback and the number of points awarded.

Question: {{{question}}}

Student Answer: {{{answer}}}

Reference Answer: {{{referenceAnswer}}}

Maximum Points: {{{maxPoints}}}

Your grade and feedback:`,
});

const gradeShortAnswerExamFlow = ai.defineFlow(
  {
    name: 'gradeShortAnswerExamFlow',
    inputSchema: GradeShortAnswerExamInputSchema,
    outputSchema: GradeShortAnswerExamOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!
  }
);