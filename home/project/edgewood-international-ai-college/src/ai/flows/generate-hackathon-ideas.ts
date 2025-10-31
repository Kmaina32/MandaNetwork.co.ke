
'use server';

/**
 * @fileOverview An AI agent for generating hackathon ideas.
 */

import { ai } from '@/ai/genkit-instance';
import { z } from 'zod';
import { googleAI } from '@genkit-ai/google-genai';

export const GenerateHackathonIdeasInputSchema = z.object({
  theme: z.string().describe('The central theme for the hackathon ideas, e.g., "Fintech in Kenya".'),
  count: z.number().min(1).max(5).default(3).describe('The number of hackathon ideas to generate.'),
});
export type GenerateHackathonIdeasInput = z.infer<typeof GenerateHackathonIdeasInputSchema>;

const HackathonIdeaSchema = z.object({
  title: z.string().describe('A catchy and descriptive title for the hackathon.'),
  description: z.string().describe('A paragraph describing the hackathon\'s goal, target audience, and potential impact.'),
  prizeMoney: z.number().describe('A suggested total prize pool amount in Kenyan Shillings (Ksh).'),
});

export const GenerateHackathonIdeasOutputSchema = z.object({
  ideas: z.array(HackathonIdeaSchema).describe('An array of generated hackathon ideas.'),
});
export type GenerateHackathonIdeasOutput = z.infer<typeof GenerateHackathonIdeasOutputSchema>;


export async function generateHackathonIdeas(input: GenerateHackathonIdeasInput): Promise<GenerateHackathonIdeasOutput> {
  
  const prompt = `You are an expert event planner for a Kenyan tech education platform called Manda Network. Your task is to brainstorm ${input.count} creative and engaging hackathon ideas based on the theme: "${input.theme}".

For each idea, provide:
1.  A catchy, marketable title.
2.  A compelling description explaining the goal and why it's relevant for developers in Kenya.
3.  A realistic prize money suggestion in Kenyan Shillings (Ksh).

The ideas should be innovative and appeal to a wide range of developers, from students to professionals.`;
  
  const response = await ai.generate({
      prompt: prompt,
      output: {
        schema: GenerateHackathonIdeasOutputSchema,
      },
  });

  const output = response.output;
  if (!output) {
      throw new Error('Failed to generate hackathon ideas.');
  }

  return output;
}
