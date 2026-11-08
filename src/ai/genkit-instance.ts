// Server-only Genkit configuration for NVIDIA NIM.
import { genkit } from 'genkit';
import { openAICompatible } from '@genkit-ai/compat-oai';
import { modelFor } from './model-config';

const apiKey = process.env.NVIDIA_API_KEY;

if (!apiKey && process.env.NODE_ENV === 'production') {
  console.warn('NVIDIA_API_KEY is not configured. Varban Academy AI features are unavailable.');
}

export const ai = genkit({
  plugins: apiKey ? [openAICompatible({
    name: 'nvidia',
    apiKey,
    baseURL: 'https://integrate.api.nvidia.com/v1',
  })] : [],
  model: modelFor('student'),
});
