
'use server';

/**
 * @fileOverview An AI agent for tutoring students on course content.
 *
 * - courseTutor - A function that answers questions about a given lesson.
 * - CourseTutorInput - The input type for the courseTutor function.
 * - CourseTutorOutput - The return type for the courseTutor function.
 */

import { ai } from '@/ai/genkit-instance';
import {z} from 'genkit';
import { textToSpeech } from './text-to-speech';
import { googleAI } from '@genkit-ai/googleai';

const HistoryItemSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const CourseTutorInputSchema = z.object({
  question: z.string().optional().describe('The student\'s question about the lesson, or a command like "Tutor me".'),
  action: z.enum(['summarize', 'quiz']).optional().describe('A specific action for the tutor to perform.'),
  courseTitle: z.string().describe('The title of the course, to be used for broader context.'),
  courseContext: z.string().describe('The full text content of the current lesson.'),
  history: z.array(HistoryItemSchema).optional().describe('The previous conversation history.'),
  voice: z.string().optional().describe('The selected voice for the TTS.'),
  speed: z.number().optional().describe('The selected speed for the TTS.'),
});
export type CourseTutorInput = z.infer<typeof CourseTutorInputSchema>;

const CourseTutorOutputSchema = z.object({
  answer: z.string().describe("Gina's helpful answer to the student's question or the next step in the tutoring session."),
  suggestions: z.array(z.string()).optional().describe('A list of 2-3 relevant follow-up questions the student might have.'),
});
export type CourseTutorOutput = z.infer<typeof CourseTutorOutputSchema>;

export async function courseTutor(
  input: CourseTutorInput
): Promise<CourseTutorOutput> {
  return courseTutorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'courseTutorPrompt',
  model: googleAI.model('gemini-1.5-flash-latest'),
  input: {schema: CourseTutorInputSchema},
  output: {schema: CourseTutorOutputSchema},
  prompt: `You are Gina, an expert AI Tutor for the Manda Network online learning platform. Your tone is encouraging, friendly, and very helpful. You are having a continuous conversation with a student.

**Your Primary Goal:**
Your main goal is to be a proactive, conversational tutor. Go beyond the provided lesson material by using the course title ('{{{courseTitle}}}') to introduce broader concepts, provide deeper insights, and give richer examples. You should guide the conversation, check for understanding, and make the session interactive.

**Critical Instructions & Behavior Scenarios:**

1.  **Direct Question:** If the user asks a direct question ('{{{question}}}'), answer it first. Use the provided 'Lesson Content' as your primary source, but enrich your answer with broader knowledge related to the '{{{courseTitle}}}'. If the question cannot be answered from the context, politely explain that. After answering, ALWAYS ask a follow-up question to check for understanding or to guide the conversation forward.

2.  **Guided Tutoring ("Tutor me"):** If the user asks to be tutored (e.g., "Tutor me", "Explain this lesson"), initiate a step-by-step tutoring session.
    *   Start by introducing the first key concept from the lesson.
    *   Explain it clearly and concisely, adding extra context related to the overall course title.
    *   End your explanation by asking a simple question to check for understanding (e.g., "Does that make sense?", "What do you think is the most important part of that?").
    *   Provide 2-3 short, relevant follow-up questions as suggestions.

3.  **Summarize Action:** If the 'action' field is 'summarize', provide a concise, bullet-point summary of the lesson. Start with a friendly intro like "Of course! Here is a summary of the key points from this lesson:".

4.  **Quiz Action:** If the 'action' field is 'quiz', generate a short, 3-question multiple-choice quiz based on the lesson content. Each question must have 3-4 options and a separate answer key at the end.

5.  **Conversation History:**
    *   Review the 'history' to understand the flow of the conversation.
    *   Do not repeat information you've already given unless the student asks for it.
    *   Refer to previous points if it helps to build on a concept.

---
**Course Title (For broad context):** {{{courseTitle}}}
---
**Lesson Content (Primary source):**
{{{courseContext}}}
---
{{#if history}}
**Conversation History (What we've already discussed):**
{{#each history}}
**{{role}}**: {{content}}
{{/each}}
---
{{/if}}
**Student's Latest Input:**
"{{{question}}}"

Please provide your response. Remember to be proactive and conversational, guiding the student through their learning.`,
});

const courseTutorFlow = ai.defineFlow(
  {
    name: 'courseTutorFlow',
    inputSchema: CourseTutorInputSchema,
    outputSchema: CourseTutorOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);

    if (!output) {
      throw new Error('Failed to generate a text answer.');
    }
    
    // By default, only return text. Audio is handled on-demand by the client.
    return {
        answer: output.answer,
        suggestions: output.suggestions,
    };
  }
);
