// src/app/instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // This code will only run on the server
    await import('../ai/genkit-instance');
  }
}
