/** Server-side NVIDIA NIM routing. Values are exact NVIDIA API Catalog model IDs. */
const modelRef = (modelId: string) => `nvidiaNim/${modelId}`;

export const NVIDIA_MODEL_ROUTING = {
  student: modelRef(process.env.NVIDIA_STUDENT_MODEL?.trim() || 'deepseek-ai/deepseek-v4.1-flash'),
  help: modelRef(
    process.env.NVIDIA_HELP_MODEL?.trim()
      || process.env.NVIDIA_SUPPORT_MODEL?.trim()
      || 'nvidia/nemotron-3.5-bolt-e4b',
  ),
  admin: modelRef(process.env.NVIDIA_ADMIN_MODEL?.trim() || 'nvidia/nemotron-3-super-120b-a12b'),
} as const;

export function assertNvidiaConfigured(): void {
  if (!process.env.NVIDIA_API_KEY?.trim()) {
    throw new Error('NVIDIA_API_KEY is not configured. Add it as a server-only environment variable.');
  }
}
