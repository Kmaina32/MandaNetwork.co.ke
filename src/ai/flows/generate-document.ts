
'use server';
/**
 * @fileOverview An AI agent for formalizing documentation.
 */

import { ai } from '@/ai/genkit-instance';
import { z } from 'zod';
import { googleAI } from '@genkit-ai/googleai';

export const GenerateFormalDocumentInputSchema = z.object({
  docType: z.enum(['PITCH_DECK.md', 'FRAMEWORK.md', 'API.md', 'B2B_STRATEGY.md', 'SEO_STRATEGY.md', 'VISUAL_FRAMEWORK.md', 'PORTFOLIO_ROADMAP.md']),
  content: z.string().describe('The current markdown content of the document.'),
});
export type GenerateFormalDocumentInput = z.infer<typeof GenerateFormalDocumentInputSchema>;

export const GenerateFormalDocumentOutputSchema = z.object({
  formal_document: z.string().describe('The updated, formalized markdown content of the document.'),
});
export type GenerateFormalDocumentOutput = z.infer<typeof GenerateFormalDocumentOutputSchema>;

const prompts = {
    'PITCH_DECK.md': `You are a startup consultant and pitch deck expert. Your task is to take the provided PITCH_DECK.md content and make it more compelling for potential investors. Sharpen the messaging, improve the narrative flow, and ensure each slide has a clear, powerful point. The output must be in well-formatted markdown, structured as a 10-slide deck.`,
    'FRAMEWORK.md': `You are an expert technical writer. Your task is to refine the provided FRAMEWORK.md content. Improve its structure, clarity, and professionalism. Ensure it accurately reflects a modern tech stack (Next.js, Firebase, Genkit) and follows best practices for technical documentation. The output should be in well-formatted markdown.`,
    'API.md': `You are an API documentation specialist. Review the provided API.md content and improve it. Ensure it follows OpenAPI standards where applicable (even in markdown), is clear for external developers, and includes examples. The output must be in well-formatted markdown.`,
    'B2B_STRATEGY.md': `You are a business strategist. Your task is to formalize the provided B2B_STRATEGY.md content. Ensure it uses clear business language, follows a logical structure for a strategy document, and includes all necessary components like vision, target audience, features, and pricing. The output must be in well-formatted markdown.`,
    'SEO_STRATEGY.md': `You are an SEO expert. Your task is to refine the provided SEO_STRATEGY.md content. Improve its structure, clarity, and professionalism. Ensure it follows best practices for SEO strategy documentation, including keyword research, on-page, technical, and off-page SEO. The output should be in well-formatted markdown.`,
    'VISUAL_FRAMEWORK.md': `You are a UI/UX designer and technical artist. Your task is to refine the provided VISUAL_FRAMEWORK.md content. Ensure the Mermaid diagrams are well-structured, clear, and accurately represent the application's architecture and user flows. The output must be in well-formatted markdown.`,
    'PORTFOLIO_ROADMAP.md': 'You are a product manager. Refine the provided PORTFOLIO_ROADMAP.md content. Organize the features into a logical phased rollout (e.g., Phase 1, Phase 2). Ensure the language is clear, strategic, and professional.'
};

export async function generateFormalDocument(input: GenerateFormalDocumentInput): Promise<GenerateFormalDocumentOutput> {
    return generateFormalDocumentFlow(input);
}

const generateFormalDocumentFlow = ai.defineFlow(
  {
    name: 'generateFormalDocumentFlow',
    inputSchema: GenerateFormalDocumentInputSchema,
    outputSchema: GenerateFormalDocumentOutputSchema,
  },
  async ({ docType, content }) => {
    
    const response = await ai.generate({
        prompt: `
            ${prompts[docType]}

            Here is the current document content:
            ---
            ${content}
            ---
        `,
        output: {
            schema: GenerateFormalDocumentOutputSchema,
        },
    });
    
    const output = response.output;
    if (!output) {
        throw new Error('Failed to generate document content.');
    }

    return output;
  }
);
