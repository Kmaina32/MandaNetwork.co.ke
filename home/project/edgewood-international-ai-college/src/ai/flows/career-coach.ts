'use server';

/**
 * @fileOverview An AI career coach to generate personalized learning paths.
 *
 * - getLearningPath - A function that generates a learning path based on a career goal.
 * - LearningPathInput - The input type for the getLearningPath function.
 * - LearningPathOutput - The return type for the getLearningPath function.
 */

import { ai } from '@/ai/genkit-instance';
import { z } from 'zod';
import { listCoursesTool } from '../tools/course-catalog';

const HistoryItemSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const LearningPathInputSchema = z.object({
  careerGoal: z.string().describe("The user's stated career goal."),
  history: z.array(HistoryItemSchema).optional().describe('The previous conversation history.'),
});
export type LearningPathInput = z.infer<typeof LearningPathInputSchema>;

const LearningStepSchema = z.object({
  courseId: z.string().describe('The ID of the recommended course for this step.'),
  courseTitle: z.string().describe('The title of the recommended course.'),
  reasoning: z.string().describe('A detailed explanation of why this course is recommended for this step and how it contributes to the overall career goal.'),
});

const LearningPathOutputSchema = z.object({
  introduction: z.string().describe('A friendly and encouraging introduction to the learning path.'),
  learningPath: z.array(LearningStepSchema).describe('A list of courses, in order, that form the learning path. If no relevant courses are found, this should be an empty array.'),
  conclusion: z.string().describe('A motivating concluding statement to encourage the student to start. If no path is generated, this should explain why and suggest next steps.'),
});
export type LearningPathOutput = z.infer<typeof LearningPathOutputSchema>;

export async function getLearningPath(
  input: LearningPathInput
): Promise<LearningPathOutput> {
  return careerCoachFlow(input);
}

const prompt = ai.definePrompt({
  name: 'careerCoachPrompt',
  tools: [listCoursesTool],
  input: { schema: LearningPathInputSchema },
  output: { schema: LearningPathOutputSchema },
  prompt: `You are an expert AI Career Coach for Manda Network. Your task is to create a personalized learning path for a student based on their stated career goal and their conversation history.

**CRITICAL INSTRUCTIONS:**

1.  **MUST USE TOOL:** You MUST start by calling the \`listCourses\` tool to get the full catalog of available courses. Do not recommend any courses without first checking what is available.
2.  **Analyze the Goal and History:** Understand the student's most recent career goal: "{{careerGoal}}". Also, review the past conversation for context.
{{#if history}}
---
**Conversation History:**
{{#each history}}
**{{role}}**: {{content}}
{{/each}}
---
{{/if}}
3.  **Select Courses:** Based on the student's goal and the available courses from the tool, select a logical sequence of 2-4 courses that will help them achieve their goal.
4.  **Handle No Relevant Courses:** If no courses in the catalog are a good fit for the user's goal, you MUST return an empty \`learningPath\` array and explain in the \`conclusion\` that you couldn't find a relevant path and suggest they browse the catalog manually.
5.  **Create the Path:** If relevant courses are found, structure your response as a clear, step-by-step learning path. For each step:
    *   Provide the exact \`courseId\` and \`courseTitle\` from the tool's output. **\`courseId\` must not be null.**
    *   Provide clear, encouraging, and detailed reasoning for why that course is the right choice for that step and how it builds towards the final goal.
6.  **Write Introduction and Conclusion:** Add a friendly introduction and a motivating concluding statement.

Your tone should be encouraging, professional, and empowering.`,
});

const careerCoachFlow = ai.defineFlow(
  {
    name: 'careerCoachFlow',
    inputSchema: LearningPathInputSchema,
    outputSchema: LearningPathOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);