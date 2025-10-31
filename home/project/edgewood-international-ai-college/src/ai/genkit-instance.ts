
// This file is for SERVER-SIDE use only.
// It initializes the Genkit instance with plugins that have server dependencies.
// Do NOT import this file in any client-side components.

import { genkit, Plugin } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { openAI } from '@genkit-ai/openai';
import {anthropic} from 'genkitx/anthropic';
import { getHeroData } from '@/lib/firebase-service';

const plugins: Plugin<any>[] = [];

let aiProvider = process.env.AI_PROVIDER;

async function configurePlugins() {
    if (!aiProvider) {
        try {
            const settings = await getHeroData();
            aiProvider = settings.aiProvider || 'gemini';
        } catch (e) {
            console.warn("Could not fetch AI provider setting from DB, defaulting to Gemini.", e);
            aiProvider = 'gemini';
        }
    }

    switch (aiProvider) {
        case 'openai':
            if (process.env.OPENAI_API_KEY) {
                plugins.push(openAI());
            } else {
                 console.warn("AI_PROVIDER is 'openai' but OPENAI_API_KEY is not set. AI features will be disabled.");
            }
            break;
        case 'anthropic':
            if (process.env.ANTHROPIC_API_KEY) {
                plugins.push(anthropic());
            } else {
                console.warn("AI_PROVIDER is 'anthropic' but ANTHROPIC_API_KEY is not set. AI features will be disabled.");
            }
            break;
        case 'custom':
             if (process.env.CUSTOM_LLM_ENDPOINT) {
                // IMPORTANT: This is a placeholder for your custom LLM integration.
                // You would typically use a custom Genkit plugin to connect to your own model API.
                // For example: `plugins.push(myCustomLlmPlugin({ endpoint: process.env.CUSTOM_LLM_ENDPOINT }))`
                console.log(`Configuring custom LLM provider with endpoint: ${process.env.CUSTOM_LLM_ENDPOINT}`);
             } else {
                 console.warn("AI_PROVIDER is 'custom' but CUSTOM_LLM_ENDPOINT is not set. AI features will be disabled.");
             }
             break;
        case 'gemini':
        default:
            if (process.env.GEMINI_API_KEY) {
                plugins.push(googleAI());
            } else {
                console.warn("AI_PROVIDER is 'gemini' but GEMINI_API_KEY is not set. All AI features will be disabled.");
            }
            break;
    }

    if (plugins.length === 0 && process.env.NODE_ENV === 'production') {
        console.error("No AI provider API keys are set for the configured provider in production. AI features will be disabled.");
    } else if (plugins.length === 0) {
         console.warn("No AI provider could be configured. All AI features will be disabled.");
    }
}

await configurePlugins();


export const ai = genkit({
  plugins,
});
