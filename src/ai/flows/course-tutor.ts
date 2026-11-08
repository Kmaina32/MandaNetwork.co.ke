
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
import { googleAI } from '@genkit-ai/googleai';
import { DEFAULT_TUTOR_MODEL, TUTOR_MODEL_IDS } from '@/lib/tutor-models';

const HistoryItemSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const CourseTutorInputSchema = z.object({
  model: z.enum(TUTOR_MODEL_IDS).default(DEFAULT_TUTOR_MODEL).describe('The Gemini model selected by the learner.'),
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


const courseTutorFlow = ai.defineFlow(
  {
    name: 'courseTutorFlow',
    inputSchema: CourseTutorInputSchema,
    outputSchema: CourseTutorOutputSchema,
  },
  async input => {
    if (!process.env.GEMINI_API_KEY?.trim()) {
      throw new Error('GEMINI_API_KEY is not configured for the AI tutor.');
    }

    const historyText = (input.history || [])
      .map((message) => `${message.role}: ${message.content}`)
      .join('\n');
    const requestedAction = input.action === 'summarize'
      ? 'Summarize this lesson in concise bullet points.'
      : input.action === 'quiz'
        ? 'Create a three-question multiple-choice quiz with 3-4 options per question and an answer key.'
        : 'Answer the learner’s latest question and guide them with a follow-up question.';
    const promptText = `You are Gina, an expert, encouraging AI tutor for Varban Academy.
Teach clearly, patiently, and conversationally. Use the lesson content as your primary source, while adding accurate broader context relevant to the course. If the lesson does not contain enough information, say so rather than inventing details.

Course: ${input.courseTitle}
Lesson content:
${input.courseContext}

Previous conversation:
${historyText || 'No previous messages.'}

Requested action: ${requestedAction}
Learner's latest message: ${input.question || requestedAction}

For guided tutoring, teach one key concept at a time, check understanding, and provide 2-3 short relevant follow-up suggestions. For summaries, focus on the most important ideas. For quizzes, include the correct answer key separately.

Return a helpful answer and optional follow-up suggestions.`;

    const response = await ai.generate({
      model: googleAI.model(input.model || DEFAULT_TUTOR_MODEL),
      prompt: promptText,
      output: { schema: CourseTutorOutputSchema },
    });
    const output = response.output;

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
