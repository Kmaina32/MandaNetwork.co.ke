import { NVIDIA_MODEL_ROUTING, assertNvidiaConfigured } from './nvidia-models';

describe('NVIDIA model routing', () => {
  it('uses an NVIDIA NIM model for student learning', () => {
    expect(NVIDIA_MODEL_ROUTING.student).toMatch(/^nvidiaNim\/(nvidia|deepseek-ai|z-ai)\//);
  });
  it('routes platform help to a distinct NVIDIA model', () => {
    expect(NVIDIA_MODEL_ROUTING.help).toMatch(/^nvidiaNim\/(nvidia|deepseek-ai|z-ai)\//);
    expect(NVIDIA_MODEL_ROUTING.help).not.toBe(NVIDIA_MODEL_ROUTING.student);
  });
  it('routes administrator generation to an advanced NVIDIA model', () => {
    expect(NVIDIA_MODEL_ROUTING.admin).toMatch(/^nvidiaNim\/(nvidia|deepseek-ai|z-ai)\//);
    expect(NVIDIA_MODEL_ROUTING.admin).not.toBe(NVIDIA_MODEL_ROUTING.student);
  });
  it('fails closed when the server API key is missing', () => {
    const previous = process.env.NVIDIA_API_KEY;
    delete process.env.NVIDIA_API_KEY;
    expect(() => assertNvidiaConfigured()).toThrow('NVIDIA_API_KEY is not configured');
    if (previous) process.env.NVIDIA_API_KEY = previous;
  });
});
