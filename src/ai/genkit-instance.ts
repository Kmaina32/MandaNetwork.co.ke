
// This file is for SERVER-SIDE use only.
// It initializes the Genkit instance with plugins that have server dependencies.
// Do NOT import this file in any client-side components.

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

const plugins = [];

if (process.env.GEMINI_API_KEY) {
  plugins.push(googleAI());
} else {
  if (process.env.NODE_ENV === 'production') {
    console.warn("GEMINI_API_KEY is not set. Google AI features will be disabled.");
  } else {
    console.warn("GEMINI_API_KEY is not set. All AI features will be disabled.");
  }
}

export const ai = genkit({
  plugins,
});
