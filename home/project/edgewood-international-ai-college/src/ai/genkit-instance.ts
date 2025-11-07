

// This file is for SERVER-SIDE use only.
// It initializes the Genkit instance with plugins that have server dependencies.
// Do NOT import this file in any client-side components.

import { genkit, Plugin } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { openAI } from '@genkit-ai/openai';
import {anthropic} from 'genkitx/anthropic';
import { getHeroData } from '@/lib/firebase-service';

const plugins: Plugin<any>[] = [];

async function configurePlugins() {
    let aiProvider: string | undefined;
    let customModelId: string | undefined;
    
    // Try to get provider from environment variables first
    aiProvider = process.env.AI_PROVIDER;

    // If not set, fetch from the database
    if (!aiProvider) {
        try {
            const settings = await getHeroData();
            aiProvider = settings.aiProvider || 'gemini';
            customModelId = settings.customModelId;
        } catch (e) {
            console.warn("Could not fetch AI provider setting from DB, defaulting to Gemini.", e);
            aiProvider = 'gemini';
        }
    }
    
    const model = customModelId ? googleAI.model(customModelId) : undefined;
    const modelConfig = model ? { model } : {};

    switch (aiProvider) {
        case 'openai':
            if (process.env.OPENAI_API_KEY) {
                plugins.push(openAI(modelConfig));
                 console.log("Using OpenAI as the AI provider.");
            } else {
                 console.warn("AI_PROVIDER is 'openai' but OPENAI_API_KEY is not set. Falling back to Gemini.");
                 plugins.push(googleAI(modelConfig));
            }
            break;
        case 'anthropic':
            if (process.env.ANTHROPIC_API_KEY) {
                plugins.push(anthropic(modelConfig));
                console.log("Using Anthropic as the AI provider.");
            } else {
                console.warn("AI_PROVIDER is 'anthropic' but ANTHROPIC_API_KEY is not set. Falling back to Gemini.");
                plugins.push(googleAI(modelConfig));
            }
            break;
        case 'gemini':
        default:
            if (process.env.GEMINI_API_KEY) {
                plugins.push(googleAI(modelConfig));
                const providerMessage = customModelId 
                    ? `Using Google Gemini with custom model: ${customModelId}` 
                    : "Using Google Gemini as the AI provider.";
                console.log(providerMessage);
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
