export const TUTOR_MODELS = [
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    description: 'Recommended balance of reasoning, speed and quality.',
    recommended: true,
  },
  {
    id: 'gemini-3.5-flash-lite',
    name: 'Gemini 3.5 Flash-Lite',
    description: 'Fast, efficient responses for everyday questions.',
    recommended: false,
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    description: 'Advanced reasoning for complex lesson topics (preview).',
    recommended: false,
  },
] as const;

export type TutorModelId = (typeof TUTOR_MODELS)[number]['id'];
export const TUTOR_MODEL_IDS = TUTOR_MODELS.map((model) => model.id) as [
  TutorModelId,
  ...TutorModelId[],
];
export const DEFAULT_TUTOR_MODEL: TutorModelId = 'gemini-3.8-flash';
