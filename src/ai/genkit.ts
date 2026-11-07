// This is a "safe" entry point for Genkit that can be imported by client components.
// It should not initialize any plugins that have server-side dependencies.

// We export the type and a flag to check if AI features are configured.
// The actual AI instance is created in a separate, server-only file.

import { genkit } from 'genkit';

export type AI = ReturnType<typeof genkit>;
