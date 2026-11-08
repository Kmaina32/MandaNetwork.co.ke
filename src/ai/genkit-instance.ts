// Server-only Genkit configuration. Text generation is routed through NVIDIA NIM.
// Gemini remains temporarily available only for the existing speech adapter pending NVIDIA Riva setup.
import { genkit } from 'genkit';
import { openAICompatible } from '@genkit-ai/compat-oai';
import { googleAI } from '@genkit-ai/googleai';
import { NVIDIA_MODEL_ROUTING } from '@/lib/nvidia-models';

const plugins: any[] = [];

if (process.env.NVIDIA_API_KEY?.trim()) {
  plugins.push(openAICompatible({
    name: 'nvidiaNim',
    apiKey: process.env.NVIDIA_API_KEY.trim(),
    baseURL: 'https://integrate.api.nvidia.com/v1',
    timeout: 90_000,
  }));
}
if (process.env.GEMINI_API_KEY?.trim()) plugins.push(googleAI());

export const ai = genkit({
  plugins,
  ...(process.env.NVIDIA_API_KEY?.trim() ? { model: NVIDIA_MODEL_ROUTING.admin } : {}),
});
