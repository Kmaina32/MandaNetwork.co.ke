
'use server';

/**
 * @fileOverview An AI portfolio advisor.
 *
 * - getPortfolioFeedback - A function that generates feedback on a user's portfolio.
 * - GetPortfolioFeedbackInput - The input type for the getPortfolioFeedback function.
 * - GetPortfolioFeedbackOutput - The return type for the getPortfolioFeedback function.
 */

import { ai } from '@/ai/genkit-instance';
import { z } from 'zod';
import { RegisteredUser } from '@/lib/types';
import { googleAI } from '@genkit-ai/google-genai';

export const GetPortfolioFeedbackInputSchema = z.object({
  userProfile: z.custom<RegisteredUser>().describe("The student's full profile data, including portfolio, courses, and achievements."),
});
export type GetPortfolioFeedbackInput = z.infer<typeof GetPortfolioFeedbackInputSchema>;

export const GetPortfolioFeedbackOutputSchema = z.object({
  overallFeedback: z.string().describe("A high-level summary of the portfolio's strengths and areas for improvement."),
  actionableSteps: z.array(z.string()).describe("A list of 3-5 specific, actionable steps the student can take to improve their portfolio for the Kenyan tech job market."),
});
export type GetPortfolioFeedbackOutput = z.infer<typeof GetPortfolioFeedbackOutputSchema>;

export async function getPortfolioFeedback(
  input: GetPortfolioFeedbackInput
): Promise<GetPortfolioFeedbackOutput> {
  return getPortfolioFeedbackFlow(input);
}

const prompt = ai.definePrompt({
  name: 'portfolioAdvisorPrompt',
  input: { schema: GetPortfolioFeedbackInputSchema },
  output: { schema: GetPortfolioFeedbackOutputSchema },
  prompt: `You are an expert AI Career Advisor for Manda Network, specializing in the Kenyan tech job market. Your task is to provide personalized, actionable feedback on a student's portfolio.

**Student Profile Data:**
\`\`\`json
{{{jsonEncode userProfile}}}
\`\`\`

**Your Goal:**
Analyze the provided student profile and generate constructive feedback to help them improve their portfolio's appeal to potential employers in Kenya.

**Instructions:**

1.  **Analyze the Profile:** Carefully review all sections of the student's profile:
    *   **Core Info:** Name, About Me summary.
    *   **Courses & Achievements:** What have they learned? What badges have they earned?
    *   **Projects:** Are there any? Are they well-described? Do they have links?
    *   **Experience & Education:** Is their formal background listed?

2.  **Generate Overall Feedback:**
    *   Start with a positive and encouraging tone.
    *   Provide a high-level summary of the portfolio's current state. Highlight 1-2 key strengths (e.g., "You have a great foundation with your completed courses...").
    *   Briefly mention the general areas that need attention (e.g., "...but the portfolio would be much stronger with detailed project showcases.").

3.  **Generate Actionable Steps:**
    *   Provide a list of 3-5 clear, specific, and actionable recommendations.
    *   **Prioritize impact:** Suggest steps that will provide the most value first.
    *   **Be specific:** Instead of "Add projects," say "Add at least two of your best projects from your courses, including a description, the technologies used, and a link to the live demo or GitHub repo."
    *   **Relate to their learning:** If they've completed a "Data Science" course, suggest a data analysis project. If they've done a "Web Dev" course, suggest building a small web app.
    *   **Consider "low-hanging fruit":** If their name is "New Member", the first step should be to update their full name. If their summary is empty, that's the next priority.
    *   **Think about the Kenyan market:** Frame your advice in the context of what local tech companies are looking for.

Your response must be structured, helpful, and motivating.`,
});

const getPortfolioFeedbackFlow = ai.defineFlow(
  {
    name: 'getPortfolioFeedbackFlow',
    inputSchema: GetPortfolioFeedbackInputSchema,
    outputSchema: GetPortfolioFeedbackOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
