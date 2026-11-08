import { DEFAULT_TUTOR_MODEL, TUTOR_MODELS, TUTOR_MODEL_IDS } from './tutor-models';

describe('lesson tutor model selection', () => {
  it('has a non-empty model catalogue with unique identifiers', () => {
    expect(TUTOR_MODELS.length).toBeGreaterThan(0);
    expect(new Set(TUTOR_MODEL_IDS).size).toBe(TUTOR_MODEL_IDS.length);
  });
  it('uses a model present in the selectable catalogue as the default', () => {
    expect(TUTOR_MODEL_IDS).toContain(DEFAULT_TUTOR_MODEL);
  });
  it('provides a readable name and description for every selectable model', () => {
    for (const model of TUTOR_MODELS) {
      expect(model.name.trim()).not.toBe('');
      expect(model.description.trim()).not.toBe('');
    }
  });
  it('uses only NVIDIA NIM model identifiers', () => {
    expect(TUTOR_MODEL_IDS.every((id) => id.startsWith('nvidiaNim/'))).toBe(true);
  });
  it('marks no more than one model as recommended', () => {
    expect(TUTOR_MODELS.filter((model) => model.recommended).length).toBeLessThanOrEqual(1);
  });
});
