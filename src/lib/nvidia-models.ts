/** Server-side NVIDIA NIM routing. Overrides are exact NVIDIA API Catalog model IDs. */
export const NVIDIA_MODEL_ROUTING = {
  student: process.env.NVIDIA_STUDENT_MODEL?.trim()
    ? `nvidiaNim/${process.env.NVIDIA_STUDENT_MODEL.trim()}`
    : 'nvidiaNim/nvidia/nemotron-3.5-lightning-30b-a3b',
  help: process.env.NVIDIA_HELP_MODEL?.trim()
    ? `nvidiaNim/${process.env.NVIDIA_HELP_MODEL.trim()}`
    : 'nvidiaNim/deepseek-ai/deepseek-v4-flash',
  admin: process.env.NVIDIA_ADMIN_MODEL?.trim()
    ? `nvidiaNim/${process.env.NVIDIA_ADMIN_MODEL.trim()}`
    : 'nvidiaNim/nvidia/nemotron-3-super-120b-a12b',
} as const;

export function assertNvidiaConfigured(): void {
  if (!process.env.NVIDIA_API_KEY?.trim()) {
    throw new Error('NVIDIA_API_KEY is not configured. Add it as a server-only environment variable.');
  }
}
