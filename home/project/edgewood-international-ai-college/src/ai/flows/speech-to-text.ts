
'use server';
/**
 * @fileOverview A flow for converting speech to text.
 *
 * - speechToText - A function that transcribes audio into text.
 */

import { ai } from '@/ai/genkit-instance';
import {z} from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const SpeechToTextInputSchema = z.object({
    audioDataUri: z
        .string()
        .describe(
            "The user's spoken audio, as a data URI that must include a MIME type and use Base64 encoding."
        ),
});

const SpeechToTextOutputSchema = z.object({
  transcript: z.string().describe('The transcribed text from the audio.'),
});

export const speechToText = ai.defineFlow(
  {
    name: 'speechToText',
    inputSchema: SpeechToTextInputSchema,
    outputSchema: SpeechToTextOutputSchema,
  },
  async ({ audioDataUri }) => {
    const { text } = await ai.generate({
      prompt: [
        {
          media: {
            url: audioDataUri,
          },
        },
        {
          text: 'Transcribe the following audio recording. The user is asking a question for an online learning platform. Please provide only the transcribed text, with no additional commentary or conversational filler.',
        },
      ],
      // Let Genkit decide the best model that supports audio input.
    });
    
    return {
      transcript: text,
    };
  }
);
