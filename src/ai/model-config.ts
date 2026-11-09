// Central model routing for Varban Academy. All model identifiers are NVIDIA NIM IDs.
// Override per environment without changing application code.
export const AI_MODELS = {
  student: process.env.NVIDIA_STUDENT_MODEL || 'deepseek-ai/deepseek-v4.1-flash',
  support: process.env.NVIDIA_SUPPORT_MODEL || 'nvidia/nemotron-3.5-bolt-e4b',
  admin: process.env.NVIDIA_ADMIN_MODEL || 'nvidia/nemotron-3-super-120b-a12b',
  adminFallback: process.env.NVIDIA_ADMIN_FALLBACK_MODEL || 'deepseek-ai/deepseek-v4.1-flash',
  embeddings: process.env.NVIDIA_EMBEDDING_MODEL || 'nvidia/nemotron-3.5-embed-1b',
  reranker: process.env.NVIDIA_RERANKER_MODEL || 'nvidia/nemotron-3.5-rerank-8b',
} as const;

export type AIProfile = 'student' | 'support' | 'admin';
export function modelFor(profile: AIProfile): string {
  const id = profile === 'student' ? AI_MODELS.student : profile === 'support' ? AI_MODELS.support : AI_MODELS.admin;
  return id.startsWith('nvidia/') ? id : `nvidia/${id}`;
}
