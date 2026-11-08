export const TUTOR_MODELS = [
  { id: 'nvidiaNim/deepseek-ai/deepseek-v4.1-flash', name: 'DeepSeek V4.1 Flash', description: 'Recommended fast model for lesson explanations, summaries and guided tutoring.', recommended: true },
  { id: 'nvidiaNim/nvidia/nemotron-3.5-lightning-30b-a3b', name: 'NVIDIA Nemotron 3.5 Lightning', description: 'Fast NVIDIA model for interactive practice and step-by-step learning.', recommended: false },
  { id: 'nvidiaNim/z-ai/glm-5.3-flash', name: 'GLM 5.3 Flash', description: 'A capable alternative for structured explanations and problem solving.', recommended: false },
  { id: 'nvidiaNim/nvidia/nemotron-3-super-120b-a12b', name: 'NVIDIA Nemotron 3 Super', description: 'Advanced reasoning for demanding technical lessons.', recommended: false },
] as const;

export type TutorModelId = (typeof TUTOR_MODELS)[number]['id'];
export const TUTOR_MODEL_IDS = TUTOR_MODELS.map((model) => model.id) as [TutorModelId, ...TutorModelId[]];
export const DEFAULT_TUTOR_MODEL: TutorModelId = 'nvidiaNim/deepseek-ai/deepseek-v4.1-flash';
